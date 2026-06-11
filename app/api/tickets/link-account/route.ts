import { auth } from "@/auth";
import { linkTicketToAccountAction } from "@/lib/actions/tickets";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	const session = await auth();
	if (!session) {
		return NextResponse.json(
			{ success: false, error: "Unauthorised" },
			{ status: 401 },
		);
	}

	try {
		const body = await request.json();
		const guestPhone = body.guest_phone;
		if (!guestPhone?.trim()) {
			return NextResponse.json(
				{ success: false, error: "guest_phone required" },
				{ status: 400 },
			);
		}

		const res = await linkTicketToAccountAction(guestPhone.trim());
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
