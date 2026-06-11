import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tickets, users } from "@/lib/db/schema";
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
	} catch (err: any) {
		return NextResponse.json(
			{ success: false, error: err.message },
			{ status: 500 },
		);
	}
}
