import { auth } from "@/auth";
import { getOwnerAnalyticsAction } from "@/lib/actions/analytics";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const session = await auth();
	if (!session || !["operator", "admin"].includes(session.user.role)) {
		return NextResponse.json(
			{ success: false, error: "Unauthorised" },
			{ status: 401 },
		);
	}

	const res = await getOwnerAnalyticsAction();
	if (!res.success) {
		return NextResponse.json(
			{ success: false, error: res.error },
			{ status: 400 },
		);
	}

	return NextResponse.json({ success: true, data: res.data });
}
