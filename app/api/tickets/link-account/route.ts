import { auth } from "@/auth";
import { linkTicketToAccountAction } from "@/lib/actions/tickets";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
	guest_phone: z.string().trim().min(7).max(20),
});

export async function POST(request: NextRequest) {
	const session = await auth();
	if (!session) {
		return NextResponse.json(
			{ success: false, error: "Unauthorised" },
			{ status: 401 },
		);
	}

	try {
		const json = await request.json().catch(() => null);
		const parsed = bodySchema.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, error: "guest_phone required" },
				{ status: 400 },
			);
		}

		const res = await linkTicketToAccountAction(parsed.data.guest_phone);
		if (!res.success) {
			return NextResponse.json(
				{ success: false, error: res.error },
				{ status: 400 },
			);
		}

		return NextResponse.json({
			success: true,
			message: res.message,
			data: res.data,
		});
	} catch (err) {
		console.error("[POST /api/tickets/link-account]", err);
		return NextResponse.json(
			{ success: false, error: "Server error" },
			{ status: 500 },
		);
	}
}
