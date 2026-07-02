import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Active-session revocation used to be checked here with a per-request DB
// query, but that pinned us to an edge-compatible driver (Neon HTTP only).
// Revocation is now handled in two places that both run on Node:
//   - auth.ts jwt() callback refreshes role / onboarded / mustChangePassword
//     against the DB every 5 minutes, so a revoked user loses their session
//     within five minutes of the next request.
//   - AppShell polls /api/auth/session every 10 seconds on the client and
//     calls signOut() if the session ever comes back as 401.
// That's enough for the threat model; nothing here needs to touch the DB.

export default auth(async (req) => {
	const { pathname } = req.nextUrl;
	const session = req.auth;
	const mustChangePwd = session?.user?.mustChangePassword;
	const onboarded = session?.user?.onboarded;

	// Public legal pages must always resolve, regardless of auth/onboarding state.
	if (pathname.startsWith("/privacy") || pathname.startsWith("/terms")) {
		return NextResponse.next();
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

	// ── First-run onboarding for passengers ──────────────────────────────────
	// Logged-in passenger with no onboardedAt → /onboarding, except on the
	// onboarding page itself, auth callbacks, and any API route.
	if (
		session &&
		session.user.role === "passenger" &&
		onboarded === false &&
		!pathname.startsWith("/onboarding") &&
		!pathname.startsWith("/change-password") &&
		!pathname.startsWith("/auth") &&
		!pathname.startsWith("/api/")
	) {
		return NextResponse.redirect(new URL("/onboarding", req.url));
	}

	// If they're already onboarded, keep them away from /onboarding.
	if (session && onboarded === true && pathname.startsWith("/onboarding")) {
		return NextResponse.redirect(new URL("/", req.url));
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
