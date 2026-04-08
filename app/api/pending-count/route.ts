// app/api/pending-count/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Returns the number of pending items for the admin badge.
// Polled every 30 s by AppShell — MUST fail silently (return 0, not 500)
// so a DB hiccup / cold Neon start doesn't spam the console with errors.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPendingCountForAdmin } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		// Auth check — non-admins always get 0
		const session = await auth();
		if (session?.user?.role !== "admin") {
			return NextResponse.json({ count: 0 });
		}

		// DB query — wrapped separately so a Neon connection error
		// returns 0 instead of an unhandled 500
		try {
			const count = await getPendingCountForAdmin();
			return NextResponse.json({ count });
		} catch (dbErr) {
			// Log once at warn level — not error — since this is a polling endpoint
			// and Neon may simply be waking up from idle
			console.warn(
				"[pending-count] DB query failed, returning 0:",
				dbErr instanceof Error ? dbErr.message : dbErr,
			);
			return NextResponse.json({ count: 0 });
		}
	} catch (authErr) {
		// Auth failure (JWT error, session decode error) — return 0 quietly
		console.warn(
			"[pending-count] Auth check failed:",
			authErr instanceof Error ? authErr.message : authErr,
		);
		return NextResponse.json({ count: 0 });
	}
}
