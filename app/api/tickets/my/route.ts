import { auth } from "@/auth";
import { getMyTicketsAction } from "@/lib/actions/tickets";
import { db } from "@/lib/db";
import { buses, routes, tickets, trips } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const session = await auth();
	if (!session) {
		return NextResponse.json(
			{ success: false, error: "Unauthorised" },
			{ status: 401 },
		);
	}

	try {
		// Enriched query matching BusLink's select join
		const rows = await db
			.select({
				id: tickets.id,
				ticketUid: tickets.ticketUid,
				userId: tickets.userId,
				guestName: tickets.guestName,
				guestPhone: tickets.guestPhone,
				tripId: tickets.tripId,
				fromStopId: tickets.fromStopId,
				toStopId: tickets.toStopId,
				fromStopName: tickets.fromStopName,
				toStopName: tickets.toStopName,
				seatCount: tickets.seatCount,
				originalFareInr: tickets.originalFareInr,
				discountType: tickets.discountType,
				discountAmountInr: tickets.discountAmountInr,
				finalFareInr: tickets.finalFareInr,
				distanceKm: tickets.distanceKm,
				qrHash: tickets.qrHash,
				status: tickets.status,
				paymentStatus: tickets.paymentStatus,
				paymentRef: tickets.paymentRef,
				paymentMethod: tickets.paymentMethod,
				upiApp: tickets.upiApp,
				isGuest: tickets.isGuest,
				expiresAt: tickets.expiresAt,
				createdAt: tickets.createdAt,
				registration_number: buses.licensePlate, // mapping registration_number to licensePlate
				bus_name: buses.number,
				route_name: routes.routeName,
			})
			.from(tickets)
			.leftJoin(trips, eq(trips.id, tickets.tripId))
			.leftJoin(buses, eq(buses.id, trips.busId))
			.leftJoin(routes, eq(routes.id, trips.routeId))
			.where(eq(tickets.userId, session.user.id))
			.orderBy(desc(tickets.createdAt))
			.limit(50);

		return NextResponse.json({ success: true, data: rows });
	} catch (err) {
		console.error("[GET /api/tickets/my]", err);
		return NextResponse.json(
			{ success: false, error: "Server error" },
			{ status: 500 },
		);
	}
}
