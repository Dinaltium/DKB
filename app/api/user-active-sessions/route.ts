import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userActiveSessions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Only return sessions that are not revoked
		const sessions = await db
			.select()
			.from(userActiveSessions)
			.where(
				and(
					eq(userActiveSessions.userId, session.user.id),
					eq(userActiveSessions.revoked, false),
				),
			)
			.orderBy(userActiveSessions.lastActive);

		return NextResponse.json({ sessions });
	} catch (error) {
		console.error("[user-active-sessions] GET failed:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

export async function POST(req: Request) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { sessionId, device, location } = await req.json();
		if (!sessionId || !device || !location) {
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		}

		// Insert or update session info, setting/resetting revoked to false
		await db
			.insert(userActiveSessions)
			.values({
				id: sessionId,
				userId: session.user.id,
				device,
				location,
				lastActive: new Date(),
				revoked: false,
			})
			.onConflictDoUpdate({
				target: userActiveSessions.id,
				set: {
					device,
					location,
					lastActive: new Date(),
					revoked: false, // Reactivate if logging back in
				},
			});

		// Return updated list of active (non-revoked) sessions
		const sessions = await db
			.select()
			.from(userActiveSessions)
			.where(
				and(
					eq(userActiveSessions.userId, session.user.id),
					eq(userActiveSessions.revoked, false),
				),
			)
			.orderBy(userActiveSessions.lastActive);

		return NextResponse.json({ sessions });
	} catch (error) {
		console.error("[user-active-sessions] POST failed:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(req: Request) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { sessionId } = await req.json();
		if (!sessionId) {
			return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
		}

		// Mark the session as revoked instead of hard-deleting
		await db
			.update(userActiveSessions)
			.set({ revoked: true })
			.where(
				and(
					eq(userActiveSessions.id, sessionId),
					eq(userActiveSessions.userId, session.user.id),
				),
			);

		// Return updated list of active (non-revoked) sessions
		const sessions = await db
			.select()
			.from(userActiveSessions)
			.where(
				and(
					eq(userActiveSessions.userId, session.user.id),
					eq(userActiveSessions.revoked, false),
				),
			)
			.orderBy(userActiveSessions.lastActive);

		return NextResponse.json({ sessions });
	} catch (error) {
		console.error("[user-active-sessions] DELETE failed:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}
