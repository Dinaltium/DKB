import { confirmPaymentAction } from "@/lib/actions/tickets";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
	ticket_uid: z.string().trim().min(1).max(64),
	upi_txn_id: z.string().trim().max(64).optional(),
	upi_app: z.string().trim().max(32).optional(),
	payment_method: z.enum(["upi", "ussd", "cash"]).default("upi"),
});

export async function POST(request: NextRequest) {
	try {
		const json = await request.json().catch(() => null);
		const parsed = bodySchema.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ success: false, error: "Invalid request body" },
				{ status: 400 },
			);
		}
		const body = parsed.data;

		const res = await confirmPaymentAction({
			ticketUid: body.ticket_uid,
			upiTxnId: body.upi_txn_id,
			paymentMethod: body.payment_method,
			upiApp: body.upi_app,
		});

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
		console.error("[POST /api/tickets/confirm-payment]", err);
		return NextResponse.json(
			{ success: false, error: "Server error" },
			{ status: 500 },
		);
	}
}
