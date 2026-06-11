"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
	buses,
	chests,
	fares,
	passes,
	rewards,
	routeStops,
	tickets,
	transactions,
	trips,
	xpEvents,
} from "@/lib/db/schema";
import { distanceBetween } from "@/lib/services/location";
import { generateTicketHash, generateTicketUID } from "@/lib/services/qr";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── Create Ticket (Book seats) ──────────────────────────────────────────────

export async function createTicketAction(data: {
	tripId: number;
	fromStopId: number;
	toStopId: number;
	seatCount: number;
	guestName?: string;
	guestPhone?: string;
	useDiscount?: boolean;
}) {
	const session = await auth();
	const isGuest = !session;

	if (!data.tripId || !data.fromStopId || !data.toStopId || !data.seatCount) {
		return { success: false, error: "Missing required fields" };
	}

	if (data.seatCount > 6) {
		return { success: false, error: "Maximum 6 seats per booking" };
	}

	if (isGuest && (!data.guestName?.trim() || !data.guestPhone?.trim())) {
		return {
			success: false,
			error: "Guest name and phone required for booking without login",
		};
	}

	// Get trip details
	const [trip] = await db
		.select()
		.from(trips)
		.where(
			and(
				eq(trips.id, data.tripId),
				sql`${trips.status} IN ('scheduled', 'active')`,
			),
		);

	if (!trip) {
		return { success: false, error: "Trip not found or not available" };
	}

	// Get fare
	const [fare] = await db
		.select()
		.from(fares)
		.where(
			and(
				eq(fares.routeId, trip.routeId!),
				eq(fares.fromStopId, data.fromStopId),
				eq(fares.toStopId, data.toStopId),
			),
		);

	if (!fare) {
		return {
			success: false,
			error: "Fare not set for this route. Contact admin.",
		};
	}

	const baseFarePerSeat = Number.parseFloat(fare.fareInr);

	// Get stop names
	const [fromStop] = await db
		.select()
		.from(routeStops)
		.where(eq(routeStops.id, data.fromStopId));
	const [toStop] = await db
		.select()
		.from(routeStops)
		.where(eq(routeStops.id, data.toStopId));

	// Calculate distance
	let distanceKm = 0;
	if (
		fromStop?.latitude &&
		fromStop?.longitude &&
		toStop?.latitude &&
		toStop?.longitude
	) {
		distanceKm = Number.parseFloat(
			distanceBetween(
				Number.parseFloat(fromStop.latitude),
				Number.parseFloat(fromStop.longitude),
				Number.parseFloat(toStop.latitude),
				Number.parseFloat(toStop.longitude),
			).toFixed(2),
		);
	}

	// Check for pass discounts
	let discountType: string | null = null;
	let discountAmount = 0;
	let finalFarePerSeat = baseFarePerSeat;

	if (!isGuest && data.useDiscount !== false) {
		const activePasses = await db
			.select()
			.from(passes)
			.where(
				and(
					eq(passes.userId, session.user.id),
					eq(passes.status, "active"),
					sql`${passes.validUntil} > NOW()`,
				),
			);

		if (activePasses.length) {
			const bestPass =
				activePasses.find((p) => p.passType === "student") ?? activePasses[0];
			discountType = bestPass.passType;
			const rate = discountType === "student" ? 0.5 : 0.15;
			discountAmount = Math.round(baseFarePerSeat * rate);
			finalFarePerSeat = baseFarePerSeat - discountAmount;
		}
	}

	const totalOriginal = baseFarePerSeat * data.seatCount;
	const totalFinal = Math.max(1, Math.round(finalFarePerSeat * data.seatCount));

	const ticketUID = await generateTicketUID(fromStop?.stopName);
	const userId = isGuest ? null : session.user.id;
	const qrHash = generateTicketHash(
		ticketUID,
		data.tripId,
		userId ?? data.guestPhone ?? null,
	);

	const [ticket] = await db
		.insert(tickets)
		.values({
			ticketUid: ticketUID,
			userId,
			guestName: data.guestName ?? null,
			guestPhone: data.guestPhone ?? null,
			tripId: data.tripId,
			fromStopId: data.fromStopId,
			toStopId: data.toStopId,
			fromStopName: fromStop?.stopName ?? "Unknown",
			toStopName: toStop?.stopName ?? "Unknown",
			seatCount: data.seatCount,
			originalFareInr: totalOriginal.toFixed(2),
			discountType,
			discountAmountInr: (discountAmount * data.seatCount).toFixed(2),
			finalFareInr: totalFinal.toFixed(2),
			distanceKm: distanceKm.toFixed(2),
			qrHash,
			status: "pending",
			paymentStatus: "pending",
			isGuest,
			expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
		})
		.returning();

	// Get operator UPI for payment
	const [bus] = await db.select().from(buses).where(eq(buses.id, trip.busId));

	revalidatePath("/dashboard");
	return {
		success: true,
		data: {
			ticket,
			fareBreakdown: {
				originalInr: totalOriginal,
				discountType,
				discountInr: discountAmount * data.seatCount,
				youPayInr: totalFinal,
			},
			distanceKm,
			qrPayload: { uid: ticketUID, hash: qrHash },
		},
	};
}

// ── Confirm Payment ─────────────────────────────────────────────────────────

export async function confirmPaymentAction(data: {
	ticketUid: string;
	upiTxnId?: string;
	paymentMethod: "upi" | "ussd" | "cash";
	upiApp?: string;
}) {
	if (!data.ticketUid) {
		return { success: false, error: "ticket_uid required" };
	}

	const [ticket] = await db
		.select()
		.from(tickets)
		.where(eq(tickets.ticketUid, data.ticketUid));

	if (!ticket) return { success: false, error: "Ticket not found" };
	if (ticket.paymentStatus === "confirmed") {
		return { success: false, error: "Payment already confirmed" };
	}

	const session = await auth();
	let userId = ticket.userId;
	if (!userId && session) {
		userId = session.user.id;
	}

	const status = data.paymentMethod === "cash" ? "cash" : "paid";
	const paymentStatus = data.paymentMethod === "cash" ? "cash" : "confirmed";

	await db
		.update(tickets)
		.set({
			status,
			paymentStatus,
			paymentRef: data.upiTxnId ?? null,
			paymentMethod: data.paymentMethod,
			upiApp: data.upiApp ?? null,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
			...(userId && !ticket.userId ? { userId, isGuest: false } : {}),
		})
		.where(eq(tickets.ticketUid, data.ticketUid));

	// Record transaction
	if (ticket.tripId) {
		const [trip] = await db
			.select()
			.from(trips)
			.where(eq(trips.id, ticket.tripId));

		if (trip) {
			await db.insert(transactions).values({
				ticketId: ticket.id,
				userId,
				amountInr: ticket.finalFareInr,
				type: "ticket_payment",
				upiTxnId: data.upiTxnId ?? null,
				status: "confirmed",
			});
		}
	}

	// Award XP if registered user
	if (userId) {
		try {
			await awardXP(userId, ticket);
		} catch (e) {
			console.error("[XP]", e);
		}
	}

	revalidatePath("/dashboard");
	return {
		success: true,
		message: "Payment confirmed. Your ticket is ready!",
		data: { ticketUid: data.ticketUid },
	};
}

// ── Get My Tickets ──────────────────────────────────────────────────────────

export async function getMyTicketsAction() {
	const session = await auth();
	if (!session) return { success: false, error: "Not authenticated" };

	const result = await db
		.select()
		.from(tickets)
		.where(eq(tickets.userId, session.user.id))
		.orderBy(desc(tickets.createdAt))
		.limit(50);

	return { success: true, data: result };
}

// ── Link Guest Ticket to Account ────────────────────────────────────────────

export async function linkTicketToAccountAction(guestPhone: string) {
	const session = await auth();
	if (!session) return { success: false, error: "Not authenticated" };

	const updated = await db
		.update(tickets)
		.set({ userId: session.user.id, isGuest: false })
		.where(
			and(eq(tickets.guestPhone, guestPhone), sql`${tickets.userId} IS NULL`),
		)
		.returning({ ticketUid: tickets.ticketUid });

	return {
		success: true,
		message: `${updated.length} ticket(s) linked to your account`,
		data: updated.map((r) => r.ticketUid),
	};
}

// ── XP Award (internal) ────────────────────────────────────────────────────

async function awardXP(
	userId: string,
	ticket: { distanceKm: string; id: number },
) {
	const distKm = Number.parseFloat(ticket.distanceKm) || 0;
	const xpEarned = Math.max(10, Math.floor(distKm / 5) * 10);

	const [existing] = await db
		.select()
		.from(rewards)
		.where(eq(rewards.userId, userId));

	const currentXP = existing?.xpPoints ?? 0;
	const newXP = currentXP + xpEarned;

	let level = "Newcomer";
	let title = "New Rider";
	if (newXP >= 5000) {
		level = "BusLink Legend";
		title = "Road Legend";
	} else if (newXP >= 2000) {
		level = "Voyager";
		title = "City Voyager";
	} else if (newXP >= 1000) {
		level = "Explorer";
		title = "City Explorer";
	} else if (newXP >= 500) {
		level = "Regular";
		title = "Daily Commuter";
	} else if (newXP >= 100) {
		level = "Commuter";
		title = "Frequent Rider";
	}

	if (existing) {
		await db
			.update(rewards)
			.set({
				xpPoints: newXP,
				xpLevel: level,
				totalKm: sql`CAST(${rewards.totalKm} AS NUMERIC) + ${distKm}`,
				updatedAt: new Date(),
			})
			.where(eq(rewards.userId, userId));
	} else {
		await db.insert(rewards).values({
			userId,
			xpPoints: newXP,
			xpLevel: level,
			activeTitle: title,
			totalKm: distKm.toFixed(2),
		});
	}

	await db.insert(xpEvents).values({
		userId,
		eventType: "trip_completed",
		xpEarned,
		kmTravelled: distKm.toFixed(2),
	});

	// Chest milestone every 250 XP
	const prevMilestone = Math.floor(currentXP / 250);
	const newMilestone = Math.floor(newXP / 250);
	if (newMilestone > prevMilestone) {
		let chestType: "normal" | "silver" | "gold" | "legendary" = "normal";
		if (newXP >= 2000) chestType = "legendary";
		else if (newXP >= 1000) chestType = "gold";
		else if (newXP >= 500) chestType = "silver";

		await db.insert(chests).values({
			userId,
			chestType,
			xpAtEarn: newXP,
		});
	}
}
