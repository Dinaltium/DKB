"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
	buses,
	complaints,
	operators,
	routes,
	tickets,
	transactions,
	trips,
} from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export async function getOwnerAnalyticsAction() {
	const session = await auth();
	if (!session || !["operator", "admin"].includes(session.user.role)) {
		return { success: false, error: "Unauthorised" };
	}

	const userId = session.user.id;

	// Fetch operator record to get operator ID if needed, but the tables reference user ID as operatorId/ownerId in some places.
	// Let's check:
	// In schema.ts: operators.userId references users.id.
	// buses.operatorId references operators.id.
	// transactions.operatorId references users.id.
	// So for buses, we need to query by operator.id (which is operators.id), where operators.userId = userId.
	// Let's get the operator record first.
	const [operator] = await db
		.select()
		.from(operators)
		.where(eq(operators.userId, userId));

	if (!operator && session.user.role !== "admin") {
		return { success: false, error: "Operator profile not found" };
	}

	const operatorId = operator?.id;

	// 1. Revenue
	// transactions.operatorId references users.id (which is userId)
	const allTransactions = await db
		.select()
		.from(transactions)
		.where(
			and(
				eq(transactions.userId, userId), // Wait, is transactions.operatorId or userId? In schema: operatorId: uuid("operator_id").references(() => users.id)
				eq(transactions.type, "ticket_payment"),
				eq(transactions.status, "confirmed"),
			),
		);
	// Wait! Let's double check if we should query by operatorId in transactions
	const txns = await db
		.select()
		.from(transactions)
		.where(
			and(
				eq(transactions.operatorId, userId),
				eq(transactions.type, "ticket_payment"),
				eq(transactions.status, "confirmed"),
			),
		);

	const now = new Date().getTime();
	const oneDay = 24 * 60 * 60 * 1000;
	const sevenDays = 7 * oneDay;
	const thirtyDays = 30 * oneDay;

	let todayInr = 0;
	let weekInr = 0;
	let monthInr = 0;
	let totalInr = 0;

	for (const tx of txns) {
		const amt = Number(tx.amountInr);
		const txTime = new Date(tx.createdAt).getTime();
		const diff = now - txTime;

		totalInr += amt;
		if (diff <= oneDay) todayInr += amt;
		if (diff <= sevenDays) weekInr += amt;
		if (diff <= thirtyDays) monthInr += amt;
	}

	// 2. Buses
	// Query buses where operatorId = operator.id
	let operatorBuses: any[] = [];
	if (operatorId) {
		operatorBuses = await db
			.select()
			.from(buses)
			.where(eq(buses.operatorId, operatorId));
	}

	const liveBusesCount = operatorBuses.filter((b) => b.isLive).length;
	const activeBusesCount = operatorBuses.filter(
		(b) => b.status === "Running",
	).length;
	const totalBusesCount = operatorBuses.length;

	// 3. Tickets
	// Tickets where bus is owned by operator
	const busIds = operatorBuses.map((b) => b.id);
	let ticketsToday = 0;
	let ticketsMonth = 0;
	let ticketsTotal = 0;

	if (busIds.length) {
		const allTickets = await db
			.select({
				ticket: tickets,
			})
			.from(tickets)
			.innerJoin(trips, eq(trips.id, tickets.tripId))
			.where(
				and(
					inArray(trips.busId, busIds),
					inArray(tickets.status, ["paid", "validated", "cash"]),
				),
			);

		for (const t of allTickets) {
			const ticketTime = new Date(t.ticket.createdAt).getTime();
			const diff = now - ticketTime;

			ticketsTotal++;
			if (diff <= oneDay) ticketsToday++;
			if (diff <= thirtyDays) ticketsMonth++;
		}
	}

	// 4. Routes Breakdown
	const allRoutes = await db
		.select()
		.from(routes)
		.where(eq(routes.isActive, true));

	const routesBreakdown = [];
	for (const r of allRoutes) {
		// Find trips for this route and operator's buses
		let routeTrips: any[] = [];
		if (busIds.length) {
			routeTrips = await db
				.select()
				.from(trips)
				.where(and(eq(trips.routeId, r.id), inArray(trips.busId, busIds)));
		}

		const routeTripIds = routeTrips.map((t) => t.id);
		let routeTickets: any[] = [];
		if (routeTripIds.length) {
			routeTickets = await db
				.select()
				.from(tickets)
				.where(
					and(
						inArray(tickets.tripId, routeTripIds),
						inArray(tickets.status, ["paid", "validated", "cash"]),
					),
				);
		}

		const revenueSum = routeTickets.reduce(
			(sum, tk) => sum + Number(tk.finalFareInr || 0),
			0,
		);

		routesBreakdown.push({
			route_name: r.routeName,
			trips: routeTrips.length,
			tickets: routeTickets.length,
			revenue_inr: revenueSum.toFixed(2),
		});
	}

	routesBreakdown.sort((a, b) => Number(b.revenue_inr) - Number(a.revenue_inr));

	// 5. Open Complaints
	let openComplaintsCount = 0;
	if (busIds.length) {
		const openComplaints = await db
			.select()
			.from(complaints)
			.where(
				and(
					inArray(complaints.busId, busIds),
					eq(complaints.status, "pending"),
				),
			);
		openComplaintsCount = openComplaints.length;
	}

	return {
		success: true,
		data: {
			revenue: {
				today_inr: todayInr.toFixed(2),
				week_inr: weekInr.toFixed(2),
				month_inr: monthInr.toFixed(2),
				total_inr: totalInr.toFixed(2),
			},
			buses: {
				live: liveBusesCount,
				active: activeBusesCount,
				total: totalBusesCount,
			},
			tickets: {
				today: ticketsToday,
				month: ticketsMonth,
				total: ticketsTotal,
			},
			routes: routesBreakdown,
			open_complaints: openComplaintsCount,
		},
	};
}

export async function getCrowdLevelAction(tripId: number) {
	try {
		let booked = 0;
		let totalSeats = 45;

		const [tripWithBus] = await db
			.select({
				totalSeats: buses.totalSeats,
			})
			.from(trips)
			.innerJoin(buses, eq(buses.id, trips.busId))
			.where(eq(trips.id, tripId));

		if (tripWithBus) {
			totalSeats = tripWithBus.totalSeats;
			const bookedRes = await db
				.select({
					count: sql<number>`count(*)`,
				})
				.from(tickets)
				.where(
					and(
						eq(tickets.tripId, tripId),
						inArray(tickets.status, ["paid", "validated", "cash"]),
					),
				);
			booked = Number(bookedRes[0]?.count || 0);
		}

		const hour = new Date().getHours();
		const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
		const pct = Math.round((booked / totalSeats) * 100);
		const level = pct > 85 || isPeak ? "high" : pct > 60 ? "medium" : "low";

		return {
			success: true,
			data: {
				occupancy_pct: pct,
				booked_seats: booked,
				total_seats: totalSeats,
				available_seats: totalSeats - booked,
				crowd_level: level,
				is_peak_hour: isPeak,
				recommendation:
					level === "high"
						? "Very crowded — book immediately"
						: level === "medium"
							? "Filling up — book soon"
							: "Plenty of seats available",
			},
		};
	} catch (err: any) {
		return {
			success: false,
			error: err.message || "Failed to calculate crowd level",
		};
	}
}
