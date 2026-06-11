"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
	buses,
	conductorAccess,
	routes,
	tickets,
	tripReports,
	tripStops,
	trips,
} from "@/lib/db/schema";
import { getCoordinates } from "@/lib/services/location";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── Helpers ─────────────────────────────────────────────────────────────────

function to24Hour(time12: string, period: "AM" | "PM"): string {
	const parts = time12.split(":").map(Number);
	let h = parts[0];
	const m = parts[1];
	if (period === "AM" && h === 12) h = 0;
	if (period === "PM" && h !== 12) h += 12;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── Create Trip (Operator) ──────────────────────────────────────────────────

export async function createTripAction(data: {
	busId: string;
	routeId: number;
	departureDate: string;
	departureTime: string;
	departurePeriod: "AM" | "PM";
	stops?: Array<{
		stopName: string;
		stopOrder: number;
		arrivalTime: string;
		arrivalPeriod: "AM" | "PM";
		latitude?: number;
		longitude?: number;
	}>;
}) {
	const session = await auth();
	if (!session || !["operator", "admin"].includes(session.user.role)) {
		return { success: false, error: "Unauthorised" };
	}

	if (
		!data.busId ||
		!data.routeId ||
		!data.departureDate ||
		!data.departureTime ||
		!data.departurePeriod
	) {
		return { success: false, error: "Missing required fields" };
	}

	// Verify bus ownership
	const [bus] = await db.select().from(buses).where(eq(buses.id, data.busId));
	if (!bus) return { success: false, error: "Bus not found" };

	const depTime24 = to24Hour(data.departureTime, data.departurePeriod);

	const [trip] = await db
		.insert(trips)
		.values({
			busId: data.busId,
			routeId: data.routeId,
			departureDate: data.departureDate,
			departureTime24: depTime24,
		})
		.returning();

	// Insert trip stops if provided
	if (data.stops?.length) {
		for (const stop of data.stops) {
			if (!stop.stopName?.trim() || !stop.stopOrder || !stop.arrivalTime) {
				continue;
			}
			const arrival24 = to24Hour(stop.arrivalTime, stop.arrivalPeriod);
			let lat = stop.latitude?.toString() ?? null;
			let lng = stop.longitude?.toString() ?? null;

			if (!lat || !lng) {
				const coords = await getCoordinates(stop.stopName);
				if (coords) {
					lat = coords.latitude.toString();
					lng = coords.longitude.toString();
				}
			}

			await db
				.insert(tripStops)
				.values({
					tripId: trip.id,
					stopName: stop.stopName.trim(),
					stopOrder: stop.stopOrder,
					arrivalTime12: stop.arrivalTime,
					arrivalPeriod: stop.arrivalPeriod,
					arrivalTime24: arrival24,
					latitude: lat,
					longitude: lng,
				})
				.onConflictDoNothing();
		}
	}

	revalidatePath("/dashboard");
	return { success: true, data: trip };
}

// ── Search Trips (Public) ───────────────────────────────────────────────────

export async function searchTripsAction(params: {
	from?: string;
	to?: string;
}) {
	const today = new Date().toISOString().slice(0, 10);

	const results = await db
		.select({
			trip: trips,
			bus: buses,
			route: routes,
		})
		.from(trips)
		.innerJoin(buses, eq(trips.busId, buses.id))
		.innerJoin(routes, eq(trips.routeId, routes.id))
		.where(
			and(
				sql`${trips.status} IN ('scheduled', 'active')`,
				gte(trips.departureDate, today),
				eq(buses.status, "Running"),
			),
		)
		.orderBy(asc(trips.departureDate), asc(trips.departureTime24))
		.limit(50);

	// Fetch stops for each trip
	const tripsWithStops = await Promise.all(
		results.map(async (r) => {
			const stops = await db
				.select()
				.from(tripStops)
				.where(eq(tripStops.tripId, r.trip.id))
				.orderBy(asc(tripStops.stopOrder));

			// Filter by from/to stop names if provided
			if (params.from?.trim()) {
				const hasFrom = stops.some((s) =>
					s.stopName.toLowerCase().includes(params.from!.trim().toLowerCase()),
				);
				if (!hasFrom) return null;
			}

			return {
				...r.trip,
				bus: r.bus,
				route: r.route,
				stops,
			};
		}),
	);

	return {
		success: true,
		data: tripsWithStops.filter((x): x is NonNullable<typeof x> => !!x),
	};
}

// ── Activate Trip (Conductor) ───────────────────────────────────────────────

export async function activateTripAction(tripId: number) {
	const session = await auth();
	if (!session || !["conductor", "admin"].includes(session.user.role)) {
		return { success: false, error: "Unauthorised" };
	}

	const conductorId = session.user.id;

	// Verify conductor has access to this trip's bus
	const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
	if (!trip) return { success: false, error: "Trip not found" };

	const accessRows = await db
		.select()
		.from(conductorAccess)
		.where(
			and(
				eq(conductorAccess.conductorId, conductorId),
				eq(conductorAccess.busId, trip.busId),
				eq(conductorAccess.isActive, true),
			),
		);

	if (!accessRows.length) {
		return { success: false, error: "You are not assigned to this trip's bus" };
	}

	await db
		.update(trips)
		.set({
			status: "active",
			conductorId,
			isLive: true,
		})
		.where(eq(trips.id, tripId));

	await db
		.update(buses)
		.set({ isLive: true, updatedAt: new Date() })
		.where(eq(buses.id, trip.busId));

	const stops = await db
		.select()
		.from(tripStops)
		.where(eq(tripStops.tripId, tripId))
		.orderBy(asc(tripStops.stopOrder));

	revalidatePath("/dashboard");
	return { success: true, data: { tripId, stops } };
}

// ── Advance Stop (Conductor) ────────────────────────────────────────────────

export async function advanceStopAction(tripId: number) {
	const session = await auth();
	if (!session) return { success: false, error: "Unauthorised" };

	const [trip] = await db
		.select()
		.from(trips)
		.where(and(eq(trips.id, tripId), eq(trips.conductorId, session.user.id)));

	if (!trip) return { success: false, error: "Trip not found" };

	const newIdx = trip.currentStopIdx + 1;
	const stops = await db
		.select()
		.from(tripStops)
		.where(eq(tripStops.tripId, tripId))
		.orderBy(asc(tripStops.stopOrder));

	const currentStop = stops[newIdx] ?? stops[stops.length - 1];

	await db
		.update(trips)
		.set({ currentStopIdx: newIdx })
		.where(eq(trips.id, tripId));

	revalidatePath("/dashboard");
	return {
		success: true,
		data: {
			currentStop: currentStop.stopName,
			currentStopIdx: newIdx,
			remainingStops: Math.max(0, stops.length - newIdx - 1),
		},
	};
}

// ── End Trip (Conductor) ────────────────────────────────────────────────────

export async function endTripAction(tripId: number) {
	const session = await auth();
	if (!session) return { success: false, error: "Unauthorised" };

	const [trip] = await db
		.select()
		.from(trips)
		.where(and(eq(trips.id, tripId), eq(trips.conductorId, session.user.id)));

	if (!trip) return { success: false, error: "Trip not found" };

	// Get ticket stats
	const tripTickets = await db
		.select()
		.from(tickets)
		.where(eq(tickets.tripId, tripId));

	const digitalCount = tripTickets.filter(
		(t) => t.status === "paid" || t.status === "validated",
	).length;
	const cashCount = tripTickets.filter((t) => t.status === "cash").length;
	const totalRevenue = tripTickets
		.filter(
			(t) =>
				t.status === "paid" || t.status === "validated" || t.status === "cash",
		)
		.reduce((sum, t) => sum + Number.parseFloat(t.finalFareInr), 0);

	await db
		.update(trips)
		.set({ status: "completed", isLive: false })
		.where(eq(trips.id, tripId));

	await db
		.update(buses)
		.set({ isLive: false, updatedAt: new Date() })
		.where(eq(buses.id, trip.busId));

	await db.insert(tripReports).values({
		tripId,
		conductorId: session.user.id,
		busId: trip.busId,
		totalPassengers: digitalCount + cashCount,
		digitalTickets: digitalCount,
		cashTickets: cashCount,
		totalRevenueInr: totalRevenue.toFixed(2),
	});

	revalidatePath("/dashboard");
	return {
		success: true,
		data: {
			totalPassengers: digitalCount + cashCount,
			digitalTickets: digitalCount,
			cashTickets: cashCount,
			totalRevenueInr: totalRevenue,
		},
	};
}
