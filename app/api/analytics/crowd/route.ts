import { getCrowdLevelAction } from "@/lib/actions/analytics";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const tripIdStr = searchParams.get("trip_id");
	if (!tripIdStr) {
		return NextResponse.json(
			{ success: false, error: "trip_id required" },
			{ status: 400 },
		);
	}

	const tripId = Number.parseInt(tripIdStr);
	if (Number.isNaN(tripId)) {
		return NextResponse.json(
			{ success: false, error: "Invalid trip_id" },
			{ status: 400 },
		);
	}

	const res = await getCrowdLevelAction(tripId);
	if (!res.success) {
		return NextResponse.json(
			{ success: false, error: res.error },
			{ status: 400 },
		);
	}

	return NextResponse.json({ success: true, data: res.data });
}
