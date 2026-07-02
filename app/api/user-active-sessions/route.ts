import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userActiveSessions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Derive a coarse device label from the User-Agent — never trust a client
// string for this, since it feeds the "active devices" / revoke UI.
function deviceFromUserAgent(ua: string | null): string {
	if (!ua) return "Unknown device";
	let os = "Unknown OS";
	if (/Windows/i.test(ua)) os = "Windows";
	else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
	else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
	else if (/Android/i.test(ua)) os = "Android";
	else if (/Linux/i.test(ua)) os = "Linux";

	let browser = "Browser";
	if (/Edg/i.test(ua)) browser = "Edge";
	else if (/OPR|Opera/i.test(ua)) browser = "Opera";
	else if (/Firefox/i.test(ua)) browser = "Firefox";
	else if (/Chrome|Chromium/i.test(ua) && !/Edg|OPR/i.test(ua))
		browser = "Chrome";
	else if (/Safari/i.test(ua)) browser = "Safari";

	return `${browser} on ${os}`;
}

// Coarse location from the request IP (proxy header). We don't geo-resolve
// server-side here; the IP is enough to distinguish sessions without trusting
// the client.
function locationFromRequest(req: Request): string {
	const fwd = req.headers.get("x-forwarded-for");
	const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
	return ip ? `IP ${ip}` : "Unknown location";
}

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

		const { sessionId } = await req.json();
		if (!sessionId) {
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		}

		// Derive device + location server-side from request metadata rather than
		// trusting client-supplied strings — otherwise a user could forge the
		// entries in their own "active devices" list and undermine revocation.
		const device = deviceFromUserAgent(req.headers.get("user-agent"));
		const location = locationFromRequest(req);

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
