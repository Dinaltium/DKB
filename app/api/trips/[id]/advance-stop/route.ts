import { auth } from "@/auth";
import { advanceStopAction } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { tickets, users } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth();
	if (!session || !["conductor", "admin"].includes(session.user.role)) {
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

		const res = await advanceStopAction(tripId);
		if (!res.success || !res.data) {
			return NextResponse.json(
				{ success: false, error: res.error },
				{ status: 400 },
			);
		}

		// BusLink also checks tickets matching the arrived destination to alert passengers
		const destPax = await db
			.select({
				id: users.id,
				name: users.name,
			})
			.from(tickets)
			.innerJoin(users, eq(users.id, tickets.userId))
			.where(
				and(
					eq(tickets.tripId, tripId),
					eq(tickets.toStopName, res.data.currentStop),
					inArray(tickets.status, ["paid", "validated"]),
				),
			);

		return NextResponse.json({
			success: true,
			data: {
				current_stop: res.data.currentStop,
				current_stop_idx: res.data.currentStopIdx,
				remaining_stops: res.data.remainingStops,
				destination_alerts_for: destPax.map((p) => p.name),
			},
		});
	} catch (err: any) {
		return NextResponse.json(
			{ success: false, error: err.message },
			{ status: 500 },
		);
	}
}
