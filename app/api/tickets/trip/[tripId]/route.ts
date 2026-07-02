import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
	buses,
	conductorAccess,
	operators,
	tickets,
	trips,
	users,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ tripId: string }> },
) {
	const session = await auth();
	if (
		!session ||
		!["conductor", "operator", "admin"].includes(session.user.role)
	) {
		return NextResponse.json(
			{ success: false, error: "Unauthorised" },
			{ status: 401 },
		);
	}

	try {
		const { tripId: tripIdStr } = await params;
		const tripId = Number.parseInt(tripIdStr);
		if (Number.isNaN(tripId)) {
			return NextResponse.json(
				{ success: false, error: "Invalid trip ID" },
				{ status: 400 },
			);
		}

		// ── Object-level authz: staff may only read tickets for a trip whose
		// bus they actually operate/are assigned to (admins exempt). Without
		// this, any conductor/operator could enumerate trip IDs and harvest
		// every passenger's name + phone. ──────────────────────────────────────
		const role = session.user.role;
		if (role !== "admin") {
			const [trip] = await db
				.select({ busId: trips.busId })
				.from(trips)
				.where(eq(trips.id, tripId));
			if (!trip) {
				return NextResponse.json(
					{ success: false, error: "Trip not found" },
					{ status: 404 },
				);
			}

			let authorised = false;
			if (role === "conductor") {
				const access = await db
					.select({ id: conductorAccess.id })
					.from(conductorAccess)
					.where(
						and(
							eq(conductorAccess.conductorId, session.user.id),
							eq(conductorAccess.busId, trip.busId),
							eq(conductorAccess.isActive, true),
						),
					);
				authorised = access.length > 0;
			} else if (role === "operator") {
				const owned = await db
					.select({ id: buses.id })
					.from(buses)
					.innerJoin(operators, eq(operators.id, buses.operatorId))
					.where(
						and(
							eq(buses.id, trip.busId),
							eq(operators.userId, session.user.id),
						),
					);
				authorised = owned.length > 0;
			}

			if (!authorised) {
				return NextResponse.json(
					{ success: false, error: "Forbidden" },
					{ status: 403 },
				);
			}
		}

		const rows = await db
			.select({
				ticketUid: tickets.ticketUid,
				seatCount: tickets.seatCount,
				fromStopName: tickets.fromStopName,
				toStopName: tickets.toStopName,
				originalFareInr: tickets.originalFareInr,
				finalFareInr: tickets.finalFareInr,
				discountType: tickets.discountType,
				status: tickets.status,
				paymentStatus: tickets.paymentStatus,
				isGuest: tickets.isGuest,
				guestName: tickets.guestName,
				passengerName: users.name,
				passengerPhone: users.phone,
			})
			.from(tickets)
			.leftJoin(users, eq(users.id, tickets.userId))
			.where(eq(tickets.tripId, tripId))
			.orderBy(tickets.createdAt);

		return NextResponse.json({ success: true, data: rows });
	} catch (err) {
		console.error("[GET /api/tickets/trip/[tripId]]", err);
		return NextResponse.json(
			{ success: false, error: "Server error" },
			{ status: 500 },
		);
	}
}
