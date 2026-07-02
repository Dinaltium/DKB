import { auth } from "@/auth";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth();
	if (!session) {
		return NextResponse.json(
			{ success: false, error: "Unauthorised" },
			{ status: 401 },
		);
	}

	try {
		const { id } = await params;
		const tripId = Number.parseInt(id);
		if (Number.isNaN(tripId)) {
			return NextResponse.json(
				{ success: false, error: "Invalid trip ID" },
				{ status: 400 },
			);
		}

		// Fetch all valid tickets for this trip.
		// Note: dkbus uses a simple seatCount instead of an array of seat numbers.
		// We'll calculate total booked seats or return occupancy information.
		// Wait, BusLink uses seat_numbers array in tickets (or seatCount in dkbus? Let's check schema.ts!)
		// In schema.ts:
		// seatCount: integer("seat_count").notNull().default(1),
		// Ah! So dkbus doesn't have individual seat numbers in tickets table, it just tracks seatCount.
		// Wait, let's look at schema.ts lines:
		// 466: seatCount: integer("seat_count").notNull().default(1),
		// Yes, tickets table has seatCount instead of seatNumbers array.
		// Let's build a map of booked seats (1 to seatCount) or simply represent the total booked seats.
		// Since dkbus tickets table only has seatCount, we can generate dummy seat numbers (e.g. 1..N) or return total booked seats.
		const ticketRows = await db
			.select({
				seatCount: tickets.seatCount,
				status: tickets.status,
			})
			.from(tickets)
			.where(
				and(
					eq(tickets.tripId, tripId),
					inArray(tickets.status, ["paid", "validated", "cash", "pending"]),
				),
			);

		// Let's generate a list of booked seat labels based on seatCount
		let currentSeat = 1;
		const seatMap: Record<number, string> = {};
		for (const t of ticketRows) {
			for (let i = 0; i < t.seatCount; i++) {
				seatMap[currentSeat] = t.status;
				currentSeat++;
			}
		}

		return NextResponse.json({ success: true, data: { seatMap } });
	} catch (err) {
		console.error("[GET /api/trips/[id]/seats]", err);
		return NextResponse.json(
			{ success: false, error: "Server error" },
			{ status: 500 },
		);
	}
}
