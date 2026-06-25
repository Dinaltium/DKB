import {
	getPendingQuickBoardTicketsAction,
	quickBoardExpireSweepAction,
} from "@/lib/actions/quick-board";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/quick-board/pending?tripId=123
// Conductor poll endpoint. Sweeps expired tickets first, then returns the
// pending column for the requested trip.
export async function GET(req: NextRequest) {
	const tripId = Number(req.nextUrl.searchParams.get("tripId"));
	if (!Number.isInteger(tripId) || tripId <= 0) {
		return NextResponse.json(
			{ success: false, error: "tripId required" },
			{ status: 400 },
		);
	}
	await quickBoardExpireSweepAction();
	const res = await getPendingQuickBoardTicketsAction(tripId);
	return NextResponse.json(res, { status: res.success ? 200 : 400 });
}
