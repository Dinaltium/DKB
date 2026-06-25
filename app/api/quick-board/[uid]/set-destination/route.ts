import { quickBoardSetDestinationAction } from "@/lib/actions/quick-board";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
	toStopId: z.number().int().positive(),
});

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ uid: string }> },
) {
	const { uid } = await params;
	const json = await req.json().catch(() => null);
	const parsed = bodySchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json(
			{ success: false, error: "Invalid body" },
			{ status: 400 },
		);
	}
	const res = await quickBoardSetDestinationAction({
		ticketUid: uid,
		toStopId: parsed.data.toStopId,
	});
	return NextResponse.json(res, { status: res.success ? 200 : 400 });
}
