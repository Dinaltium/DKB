import { auth } from "@/auth";
import { activateTripAction } from "@/lib/actions/trips";
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

		const res = await activateTripAction(tripId);
		if (!res.success) {
			return NextResponse.json(
				{ success: false, error: res.error },
				{ status: 400 },
			);
		}

		// BusLink also returned a dailyHMACSecret
		const crypto = require("node:crypto");
		const dailySecret = crypto
			.createHmac("sha256", process.env.NEXTAUTH_SECRET || "fallback_secret")
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
	} catch (err: any) {
		return NextResponse.json(
			{ success: false, error: err.message },
			{ status: 500 },
		);
	}
}
