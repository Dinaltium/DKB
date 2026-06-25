import { quickBoardStartAction } from "@/lib/actions/quick-board";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
	tripId: z.number().int().positive(),
	fromStopId: z.number().int().positive(),
	toStopId: z.number().int().positive().optional(),
	seatCount: z.number().int().min(1).max(6).optional(),
});

export async function POST(req: NextRequest) {
	const json = await req.json().catch(() => null);
	const parsed = bodySchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json(
			{ success: false, error: "Invalid body" },
			{ status: 400 },
		);
	}
	const res = await quickBoardStartAction(parsed.data);
	return NextResponse.json(res, { status: res.success ? 200 : 400 });
}
