import { auth } from "@/auth";
import { activateTripAction } from "@/lib/actions/trips";
import { createHmac } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
	_request: NextRequest,
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
		const tripId = Number.parseInt(id, 10);
		if (Number.isNaN(tripId)) {
			return NextResponse.json(
				{ success: false, error: "Invalid trip ID" },
				{ status: 400 },
			);
		}

		const res = await activateTripAction(tripId);
		if (!res.success) {
			return NextResponse.json(
				{ success: false, error: res.error },
				{ status: 400 },
			);
		}

		const authSecret = process.env.AUTH_SECRET;
		if (!authSecret) {
			console.error("[activate] AUTH_SECRET is not set");
			return NextResponse.json(
				{ success: false, error: "Server misconfiguration" },
				{ status: 500 },
			);
		}

		const dailySecret = createHmac("sha256", authSecret)
			.update(new Date().toDateString())
			.digest("hex")
			.slice(0, 32);

		return NextResponse.json({
			success: true,
			data: {
				trip_id: tripId,
				stops: res.data?.stops,
				dailyHMACSecret: dailySecret,
			},
		});
	} catch (err) {
		console.error("[POST /api/trips/[id]/activate]", err);
		return NextResponse.json(
			{ success: false, error: "Server error" },
			{ status: 500 },
		);
	}
}
