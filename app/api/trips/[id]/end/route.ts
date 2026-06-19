import { auth } from "@/auth";
import { endTripAction } from "@/lib/actions/trips";
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

		const res = await endTripAction(tripId);
		if (!res.success || !res.data) {
			return NextResponse.json(
				{ success: false, error: res.error },
				{ status: 400 },
			);
		}

		return NextResponse.json({
			success: true,
			message: "Trip ended. Report sent to owner.",
			data: {
				total_passengers: res.data.totalPassengers,
				digital_tickets: res.data.digitalTickets,
				cash_tickets: res.data.cashTickets,
				total_revenue_inr: res.data.totalRevenueInr,
			},
		});
	} catch (err) {
		console.error("[POST /api/trips/[id]/end]", err);
		return NextResponse.json(
			{ success: false, error: "Server error" },
			{ status: 500 },
		);
	}
}
