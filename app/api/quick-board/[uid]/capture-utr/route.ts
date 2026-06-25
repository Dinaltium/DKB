import { quickBoardCaptureUtrAction } from "@/lib/actions/quick-board";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
	utr: z.string().trim().min(6).max(24),
	upiApp: z.string().trim().max(32).optional(),
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
	const res = await quickBoardCaptureUtrAction({
		ticketUid: uid,
		utr: parsed.data.utr,
		upiApp: parsed.data.upiApp,
	});
	return NextResponse.json(res, { status: res.success ? 200 : 400 });
}
