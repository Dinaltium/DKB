"use server";

// Quick Board — deferred-pay UPI ticket flow.
//
// Three paths a passenger can take:
//   1. saved-dest      → passenger has a saved destination; fare is computed
//                        at boarding and they get the UPI intent immediately.
//   2. pick-dest       → passenger picks destination at boarding; same as 1
//                        but with an extra tap.
//   3. conductor-sets  → passenger taps "board, conductor will set"; ticket
//                        is created without a fare and shows up in the
//                        conductor's pending column. Conductor picks dest,
//                        fare is computed, UPI intent is pushed to passenger.
//
// In all three cases the resulting ticket starts in a PENDING state and gets
// a 15-minute `expiresAt`. The passenger pays via the operator's VPA over the
// UPI rail (we never hold the money), then submits the UTR back to us. We
// flip the ticket to PAID_UNVERIFIED. The conductor sees colour-coded rows:
//   🟢 paid (UTR present)
//   🟡 paid (UTR present, awaiting SMS-bot confirm — future)
//   🟠 claimed paid, no UTR
//   🔴 grace expired with no claim
//
// Sentinel convention (avoids a schema migration):
//   `paymentMethod = 'quick_board'`              → this is a Quick Board ticket
//   `paymentStatus = 'pending'`, `finalFareInr=0`→ pending fare (conductor-sets)
//   `paymentStatus = 'initiated'`                → fare set, awaiting UPI
//   `paymentStatus = 'confirmed'`, paymentRef set→ UTR captured (PAID_UNVERIFIED)
//   `paymentStatus = 'failed'`, status='cancelled'→ grace window expired

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
	buses,
	fares,
	operators,
	routeStops,
	tickets,
	transactions,
	trips,
	users,
} from "@/lib/db/schema";
import { distanceBetween } from "@/lib/services/location";
import { generateTicketHash, generateTicketUID } from "@/lib/services/qr";
import { buildUpiIntent, isPlausibleUtr } from "@/lib/upi";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const GRACE_MINUTES = 15;

interface OperatorVpa {
	vpa: string;
	displayName: string;
}

/** Resolves the operator's UPI VPA for a given trip (via bus → operator → user). */
async function resolveOperatorVpa(tripId: number): Promise<OperatorVpa | null> {
	const [row] = await db
		.select({
			vpa: users.upiId,
			companyName: operators.companyName,
			userName: users.name,
		})
		.from(trips)
		.innerJoin(buses, eq(buses.id, trips.busId))
		.innerJoin(operators, eq(operators.id, buses.operatorId))
		.innerJoin(users, eq(users.id, operators.userId))
		.where(eq(trips.id, tripId));
	if (!row?.vpa) return null;
	return {
		vpa: row.vpa,
		displayName: row.companyName || row.userName || "Operator",
	};
}

async function computeFare(
	tripRouteId: number,
	fromStopId: number,
	toStopId: number,
	seatCount: number,
) {
	const [fare] = await db
		.select()
		.from(fares)
		.where(
			and(
				eq(fares.routeId, tripRouteId),
				eq(fares.fromStopId, fromStopId),
				eq(fares.toStopId, toStopId),
			),
		);
	if (!fare) return null;
	const per = Number.parseFloat(fare.fareInr);
	const total = Math.max(1, Math.round(per * seatCount));
	return { perSeatInr: per, totalInr: total };
}

// ── 1. Start Quick Board ──────────────────────────────────────────────────────

/**
 * Creates a Quick Board ticket. If `toStopId` is provided (saved-dest or
 * pick-dest path), fare is computed and a UPI intent URL is returned. If
 * omitted (conductor-sets path), the ticket starts with no fare; conductor
 * sets it later via `quickBoardSetDestinationAction`.
 */
export async function quickBoardStartAction(input: {
	tripId: number;
	fromStopId: number;
	toStopId?: number;
	seatCount?: number;
}) {
	const session = await auth();
	if (!session?.user?.id) {
		return { success: false as const, error: "Sign in to use Quick Board" };
	}
	const seatCount = input.seatCount ?? 1;
	if (seatCount < 1 || seatCount > 6) {
		return { success: false as const, error: "Seat count must be 1–6" };
	}

	const [trip] = await db
		.select()
		.from(trips)
		.where(
			and(
				eq(trips.id, input.tripId),
				sql`${trips.status} IN ('scheduled', 'active')`,
			),
		);
	if (!trip) return { success: false as const, error: "Trip not active" };
	if (!trip.routeId)
		return { success: false as const, error: "Trip has no route" };

	const [fromStop] = await db
		.select()
		.from(routeStops)
		.where(eq(routeStops.id, input.fromStopId));
	if (!fromStop)
		return { success: false as const, error: "Boarding stop not found" };

	const operatorVpa = await resolveOperatorVpa(trip.id);
	if (!operatorVpa) {
		return {
			success: false as const,
			error: "Operator hasn't configured a UPI VPA yet. Pay cash to conductor.",
		};
	}

	const ticketUid = await generateTicketUID(fromStop.stopName);
	const qrHash = generateTicketHash(ticketUid, trip.id, session.user.id);
	const expiresAt = new Date(Date.now() + GRACE_MINUTES * 60 * 1000);

	// Path A/B: destination known up front → compute fare + intent now.
	let fareTotal = 0;
	let toStopName = "(pending)";
	let distanceKm = 0;
	let upiIntent: string | null = null;

	if (input.toStopId) {
		const [toStop] = await db
			.select()
			.from(routeStops)
			.where(eq(routeStops.id, input.toStopId));
		if (!toStop)
			return { success: false as const, error: "Destination stop not found" };
		toStopName = toStop.stopName;

		const fare = await computeFare(
			trip.routeId,
			input.fromStopId,
			input.toStopId,
			seatCount,
		);
		if (!fare) {
			return {
				success: false as const,
				error: "Fare not configured for this stop pair",
			};
		}
		fareTotal = fare.totalInr;

		if (
			fromStop.latitude &&
			fromStop.longitude &&
			toStop.latitude &&
			toStop.longitude
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

		upiIntent = buildUpiIntent({
			payeeVpa: operatorVpa.vpa,
			payeeName: operatorVpa.displayName,
			amountInr: fareTotal,
			txnNote: `BusLink ${ticketUid}`,
			txnRef: ticketUid,
		});
	}

	const [created] = await db
		.insert(tickets)
		.values({
			ticketUid,
			userId: session.user.id,
			tripId: trip.id,
			fromStopId: input.fromStopId,
			toStopId: input.toStopId ?? null,
			fromStopName: fromStop.stopName,
			toStopName,
			seatCount,
			originalFareInr: fareTotal.toFixed(2),
			finalFareInr: fareTotal.toFixed(2),
			distanceKm: distanceKm.toFixed(2),
			qrHash,
			status: "pending",
			paymentStatus: input.toStopId ? "initiated" : "pending",
			paymentMethod: "quick_board",
			isGuest: false,
			expiresAt,
		})
		.returning();

	revalidatePath("/dashboard");
	revalidatePath("/conductor");
	return {
		success: true as const,
		data: {
			ticket: created,
			fareInr: fareTotal,
			expiresAt,
			upiIntent,
			operatorVpa: operatorVpa.vpa,
			operatorName: operatorVpa.displayName,
			needsDestination: !input.toStopId,
		},
	};
}

// ── 2. Set Destination (conductor or passenger) ───────────────────────────────

export async function quickBoardSetDestinationAction(input: {
	ticketUid: string;
	toStopId: number;
}) {
	const session = await auth();
	if (!session?.user?.id) {
		return { success: false as const, error: "Auth required" };
	}

	const [ticket] = await db
		.select()
		.from(tickets)
		.where(eq(tickets.ticketUid, input.ticketUid));
	if (!ticket) return { success: false as const, error: "Ticket not found" };
	if (ticket.paymentMethod !== "quick_board") {
		return { success: false as const, error: "Not a Quick Board ticket" };
	}
	if (ticket.paymentStatus !== "pending") {
		return {
			success: false as const,
			error: "Destination already set or ticket finalised",
		};
	}
	if (ticket.expiresAt && ticket.expiresAt < new Date()) {
		return { success: false as const, error: "Ticket has expired" };
	}

	const role = session.user.role;
	const isStaff = role === "conductor" || role === "admin";
	const isOwner = ticket.userId === session.user.id;
	if (!isStaff && !isOwner) {
		return { success: false as const, error: "Not authorised" };
	}

	if (!ticket.tripId || !ticket.fromStopId) {
		return { success: false as const, error: "Ticket missing trip/stop info" };
	}

	const [trip] = await db
		.select()
		.from(trips)
		.where(eq(trips.id, ticket.tripId));
	if (!trip?.routeId) {
		return { success: false as const, error: "Trip has no route" };
	}

	const [toStop] = await db
		.select()
		.from(routeStops)
		.where(eq(routeStops.id, input.toStopId));
	if (!toStop) return { success: false as const, error: "Stop not found" };

	const fare = await computeFare(
		trip.routeId,
		ticket.fromStopId,
		input.toStopId,
		ticket.seatCount,
	);
	if (!fare) {
		return { success: false as const, error: "Fare not configured" };
	}

	const operatorVpa = await resolveOperatorVpa(ticket.tripId);
	if (!operatorVpa) {
		return { success: false as const, error: "Operator VPA missing" };
	}

	const [fromStop] = await db
		.select()
		.from(routeStops)
		.where(eq(routeStops.id, ticket.fromStopId));
	let distanceKm = 0;
	if (
		fromStop?.latitude &&
		fromStop?.longitude &&
		toStop.latitude &&
		toStop.longitude
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

	const upiIntent = buildUpiIntent({
		payeeVpa: operatorVpa.vpa,
		payeeName: operatorVpa.displayName,
		amountInr: fare.totalInr,
		txnNote: `BusLink ${ticket.ticketUid}`,
		txnRef: ticket.ticketUid,
	});

	await db
		.update(tickets)
		.set({
			toStopId: input.toStopId,
			toStopName: toStop.stopName,
			originalFareInr: fare.totalInr.toFixed(2),
			finalFareInr: fare.totalInr.toFixed(2),
			distanceKm: distanceKm.toFixed(2),
			paymentStatus: "initiated",
		})
		.where(eq(tickets.ticketUid, input.ticketUid));

	revalidatePath("/dashboard");
	revalidatePath("/conductor");
	return {
		success: true as const,
		data: {
			ticketUid: ticket.ticketUid,
			fareInr: fare.totalInr,
			upiIntent,
			operatorVpa: operatorVpa.vpa,
			operatorName: operatorVpa.displayName,
		},
	};
}

// ── 3. Capture UTR ────────────────────────────────────────────────────────────

export async function quickBoardCaptureUtrAction(input: {
	ticketUid: string;
	utr: string;
	upiApp?: string;
}) {
	if (!isPlausibleUtr(input.utr)) {
		return { success: false as const, error: "UTR doesn't look right" };
	}

	const [ticket] = await db
		.select()
		.from(tickets)
		.where(eq(tickets.ticketUid, input.ticketUid));
	if (!ticket) return { success: false as const, error: "Ticket not found" };
	if (ticket.paymentMethod !== "quick_board") {
		return { success: false as const, error: "Not a Quick Board ticket" };
	}
	if (ticket.paymentStatus === "confirmed") {
		return { success: false as const, error: "Already confirmed" };
	}
	if (ticket.paymentStatus !== "initiated") {
		return {
			success: false as const,
			error: "Set destination before paying",
		};
	}

	await db
		.update(tickets)
		.set({
			status: "paid",
			paymentStatus: "confirmed",
			paymentRef: input.utr.trim(),
			paymentMethod: "upi", // flips out of quick_board sentinel on success
			upiApp: input.upiApp ?? null,
			// Extend expiry: the ticket is now a valid travel doc, not a grace timer.
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
		})
		.where(eq(tickets.ticketUid, input.ticketUid));

	if (ticket.tripId) {
		await db.insert(transactions).values({
			ticketId: ticket.id,
			userId: ticket.userId,
			amountInr: ticket.finalFareInr,
			type: "ticket_payment",
			upiTxnId: input.utr.trim(),
			status: "confirmed",
		});
	}

	revalidatePath("/dashboard");
	revalidatePath("/conductor");
	return {
		success: true as const,
		data: { ticketUid: ticket.ticketUid },
	};
}

// ── 4. Expire sweep (idempotent, safe to call from any poll) ──────────────────

/**
 * Marks any Quick Board ticket whose grace window has passed as cancelled.
 * Called by the conductor screen on its 10-second poll; also safe to wire
 * to a cron later. Idempotent.
 */
export async function quickBoardExpireSweepAction() {
	const now = new Date();
	const updated = await db
		.update(tickets)
		.set({ status: "cancelled", paymentStatus: "failed" })
		.where(
			and(
				eq(tickets.paymentMethod, "quick_board"),
				inArray(tickets.paymentStatus, ["pending", "initiated"]),
				lt(tickets.expiresAt, now),
			),
		)
		.returning({ ticketUid: tickets.ticketUid });
	return { success: true as const, expiredCount: updated.length };
}

// ── 5. Conductor: list pending Quick Board tickets for a trip ─────────────────

export async function getPendingQuickBoardTicketsAction(tripId: number) {
	const session = await auth();
	if (!session?.user?.id) {
		return { success: false as const, error: "Auth required" };
	}
	const role = session.user.role;
	if (role !== "conductor" && role !== "admin") {
		return { success: false as const, error: "Conductor/admin only" };
	}

	const rows = await db
		.select()
		.from(tickets)
		.where(
			and(
				eq(tickets.tripId, tripId),
				eq(tickets.paymentMethod, "quick_board"),
				inArray(tickets.paymentStatus, ["pending", "initiated"]),
			),
		)
		.orderBy(tickets.expiresAt);

	// Also include recently-confirmed ones so the conductor can see the
	// green confirmation flash before the row drops off the column.
	const recent = await db
		.select()
		.from(tickets)
		.where(
			and(
				eq(tickets.tripId, tripId),
				eq(tickets.paymentStatus, "confirmed"),
				sql`${tickets.expiresAt} > NOW() - INTERVAL '60 seconds'`,
			),
		)
		.limit(20);

	return { success: true as const, data: { pending: rows, recent } };
}
