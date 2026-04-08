import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
	const session = await auth();
	if (!session) {
		return NextResponse.json({ error: "Unauth" }, { status: 401 });
	}

	const user = await getUserById(session.user.id);
	return NextResponse.json({
		passwordExpiresAt: user?.passwordExpiresAt ?? null,
	});
}
