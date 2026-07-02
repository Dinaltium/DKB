"use server";

// Ticket active-panel lifecycle.
//
// Design: every paid ticket has a guaranteed TIME BACKSTOP — it auto-archives
// to History after an estimated arrival time. GPS, last-known location, and the
// conductor's stop pointer are only ACCELERATORS that can archive it sooner.
// If every signal fails, the time backstop still fires, so nothing stays stuck
// on the active panel and nothing depends on GPS working.
//
// Archiving moves a ticket to History (retrievable) — it is never deleted, so a
// passenger who loses their physical ticket can still trace the bus/conductor.
// Archiving is a UX action, NOT a fraud control (conductor validation owns that).

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { routeStops, tickets, tripStops, trips } from "@/lib/db/schema";
import { distanceBetween } from "@/lib/services/location";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── Tunables ──────────────────────────────────────────────────────────────────
const ARRIVAL_RADIUS_M = 150; // within this of destination → arrived
const MAX_ACCURACY_M = 100; // ignore GPS fixes worse than this (don't false-archive)
const AVG_SPEED_KMH = 22; // urban corridor bus average
const BUFFER_MIN = 12; // slack added to the ETA
const FALLBACK_MIN = 90; // used when distance is unknown (no coords)

// Statuses that represent a real travel document eligible for auto-archive.
const ARCHIVABLE_STATUSES = ["paid", "validated", "cash"] as const;

/** Time backstop: when a ticket should auto-archive if no accelerator fires. */
function autoArchiveAt(createdAt: Date, distanceKm: number): Date {
	const minutes =
		distanceKm > 0
			? (distanceKm / AVG_SPEED_KMH) * 60 + BUFFER_MIN
			: FALLBACK_MIN;
	return new Date(createdAt.getTime() + minutes * 60 * 1000);
}

async function archive(
	ticketId: number,
	reason: "gps_arrival" | "time_estimate" | "stop_passed" | "manual",
) {
	await db
		.update(tickets)
		.set({ archivedAt: new Date(), archiveReason: reason })
		.where(eq(tickets.id, ticketId));
}

// ── 1. Passenger position report (GPS accelerator) ──────────────────────────
// Called by the client on its sparse, low-power location ticks. Stores the
// last-known fix and archives the ticket if the passenger is within
// ARRIVAL_RADIUS_M of their destination (and the fix is accurate enough).
export async function reportTicketLocationAction(input: {
	ticketUid: string;
	lat: number;
	lng: number;
	accuracy?: number;
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
	if (ticket.userId !== session.user.id) {
		return { success: false as const, error: "Not your ticket" };
	}
	if (ticket.archivedAt) {
		return {
			success: true as const,
			data: { archived: true, reason: ticket.archiveReason },
		};
	}

	// Always record the last-known fix (used to recompute ETA if GPS drops).
	await db
		.update(tickets)
		.set({
			lastKnownLat: input.lat,
			lastKnownLng: input.lng,
			lastSeenAt: new Date(),
		})
		.where(eq(tickets.id, ticket.id));

	// Accuracy guard — a garbage fix must never trigger a false arrival.
	if (input.accuracy != null && input.accuracy > MAX_ACCURACY_M) {
		return { success: true as const, data: { archived: false } };
	}

	if (ticket.toStopId) {
		const [dest] = await db
			.select({ lat: routeStops.latitude, lng: routeStops.longitude })
			.from(routeStops)
			.where(eq(routeStops.id, ticket.toStopId));
		if (dest?.lat && dest?.lng) {
			const distM =
				distanceBetween(
					input.lat,
					input.lng,
					Number(dest.lat),
					Number(dest.lng),
				) * 1000;
			if (distM <= ARRIVAL_RADIUS_M) {
				await archive(ticket.id, "gps_arrival");
				revalidatePath("/dashboard");
				return {
					success: true as const,
					data: { archived: true, reason: "gps_arrival" as const },
				};
			}
		}
	}

	return { success: true as const, data: { archived: false } };
}

// ── 2. Resolver (time backstop + stop-passed accelerator) ────────────────────
// Idempotent. Call on dashboard load / poll. Archives any of the caller's
// active tickets whose time backstop has passed or whose destination stop the
// conductor has already advanced past, then returns split active/archived lists.
export async function resolveTicketVisibilityAction() {
	const session = await auth();
	if (!session?.user?.id) {
		return { success: false as const, error: "Auth required" };
	}
	const userId = session.user.id;
	const now = new Date();

	const active = await db
		.select()
		.from(tickets)
		.where(and(eq(tickets.userId, userId), isNull(tickets.archivedAt)));

	for (const t of active) {
		const status = t.status as (typeof ARCHIVABLE_STATUSES)[number];
		if (!ARCHIVABLE_STATUSES.includes(status)) continue;

		// Time backstop.
		if (autoArchiveAt(t.createdAt, Number(t.distanceKm ?? 0)) <= now) {
			await archive(t.id, "time_estimate");
			continue;
		}

		// Stop-passed accelerator — uses the conductor's existing stop pointer,
		// no extra conductor action. Best-effort name match against the trip.
		if (t.tripId && t.toStopName) {
			const [trip] = await db
				.select({ currentStopIdx: trips.currentStopIdx })
				.from(trips)
				.where(eq(trips.id, t.tripId));
			if (trip) {
				const [destStop] = await db
					.select({ stopOrder: tripStops.stopOrder })
					.from(tripStops)
					.where(
						and(
							eq(tripStops.tripId, t.tripId),
							eq(tripStops.stopName, t.toStopName),
						),
					);
				if (destStop && trip.currentStopIdx >= destStop.stopOrder) {
					await archive(t.id, "stop_passed");
				}
			}
		}
	}

	const all = await db
		.select()
		.from(tickets)
		.where(eq(tickets.userId, userId))
		.orderBy(desc(tickets.createdAt))
		.limit(50);

	return {
		success: true as const,
		data: {
			active: all.filter((t) => !t.archivedAt),
			archived: all.filter((t) => t.archivedAt),
		},
	};
}

// ── 3. Manual archive (passenger taps "done" / "hide") ───────────────────────
export async function archiveTicketAction(ticketUid: string) {
	const session = await auth();
	if (!session?.user?.id) {
		return { success: false as const, error: "Auth required" };
	}
	const [ticket] = await db
		.select()
		.from(tickets)
		.where(eq(tickets.ticketUid, ticketUid));
	if (!ticket || ticket.userId !== session.user.id) {
		return { success: false as const, error: "Ticket not found" };
	}
	if (!ticket.archivedAt) await archive(ticket.id, "manual");
	revalidatePath("/dashboard");
	return { success: true as const };
}
