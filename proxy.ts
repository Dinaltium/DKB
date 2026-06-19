import { auth } from "@/auth";
import { db } from "@/lib/db";
import { userActiveSessions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export default auth(async (req) => {
	const { pathname } = req.nextUrl;
	const session = req.auth;
	const mustChangePwd = (
		session?.user as { mustChangePassword?: boolean } | undefined
	)?.mustChangePassword;

	// Verify active session DB state if authenticated
	if (session?.user?.id) {
		const sessionId = req.cookies.get("buslink_session_id")?.value;
		if (sessionId) {
			try {
				const active = await db
					.select()
					.from(userActiveSessions)
					.where(
						and(
							eq(userActiveSessions.id, sessionId),
							eq(userActiveSessions.userId, session.user.id),
						),
					)
					.limit(1);

				if (active.length > 0 && active[0].revoked) {
					// Session was revoked! Log out and redirect/unauthorize
					const nextUrl = new URL("/auth", req.url);
					const response = pathname.startsWith("/api/")
						? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
						: NextResponse.redirect(nextUrl);

					response.cookies.delete({
						name: "next-auth.session-token",
						path: "/",
					});
					response.cookies.delete({
						name: "__Secure-next-auth.session-token",
						path: "/",
					});
					response.cookies.delete({ name: "buslink_session_id", path: "/" });
					return response;
				}
			} catch (dbErr) {
				console.error("[middleware] DB active session check failed:", dbErr);
			}
		}
	}

	// ── Redirect old standalone routes to unified dashboard ───────────────────
	if (pathname.startsWith("/operator") || pathname.startsWith("/admin")) {
		return NextResponse.redirect(new URL("/dashboard", req.url));
	}

	if (
		session &&
		mustChangePwd === true &&
		!pathname.startsWith("/change-password") &&
		!pathname.startsWith("/api/auth") &&
		!pathname.startsWith("/api/")
	) {
		return NextResponse.redirect(new URL("/change-password", req.url));
	}

	// ── Dashboard — must be authenticated ────────────────────────────────────
	if (pathname.startsWith("/dashboard")) {
		if (!session) {
			return NextResponse.redirect(
				new URL("/auth?callbackUrl=/dashboard", req.url),
			);
		}
	}

	// ── Conductor — must be authenticated as conductor or admin ──────────────
	if (pathname.startsWith("/conductor")) {
		if (!session) {
			return NextResponse.redirect(
				new URL("/auth?callbackUrl=/conductor", req.url),
			);
		}
		if (!["conductor", "admin"].includes(session.user.role)) {
			return NextResponse.redirect(new URL("/dashboard", req.url));
		}
	}

	// ── Auth page — redirect away if already signed in ────────────────────────
	if (pathname === "/auth" && session) {
		return NextResponse.redirect(new URL("/dashboard", req.url));
	}

	return NextResponse.next();
});

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
