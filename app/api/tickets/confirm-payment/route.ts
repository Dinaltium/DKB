import { confirmPaymentAction } from "@/lib/actions/tickets";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const ticketUid = body.ticket_uid;
		const upiTxnId = body.upi_txn_id;
		const upiApp = body.upi_app;
		const paymentMethod = body.payment_method || "upi";

		const res = await confirmPaymentAction({
			ticketUid,
			upiTxnId,
			paymentMethod,
			upiApp,
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
	} catch (err: any) {
		return NextResponse.json(
			{ success: false, error: err.message },
			{ status: 500 },
		);
	}
}
