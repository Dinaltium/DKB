// app/api/stats/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Returns real aggregate counts from the database for use on the landing page.
// Replaces the hardcoded "47%", "0", "68%" marketing stats.
// ─────────────────────────────────────────────────────────────────────────────

import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buses, complaints, operators, stops } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export interface PlatformStats {
	totalBuses: number;
	totalStops: number;
	approvedOperators: number;
	pendingComplaints: number;
}

export async function GET() {
	try {
		const [busRows, stopRows, operatorRows, complaintRows] = await Promise.all([
			db.select({ total: count() }).from(buses),
			db.select({ total: count() }).from(stops),
			db
				.select({ total: count() })
				.from(operators)
				.where(eq(operators.approved, true)),
			db
				.select({ total: count() })
				.from(complaints)
				.where(eq(complaints.status, "pending")),
		]);

		const stats: PlatformStats = {
			totalBuses: busRows[0]?.total ?? 0,
			totalStops: stopRows[0]?.total ?? 0,
			approvedOperators: operatorRows[0]?.total ?? 0,
			pendingComplaints: complaintRows[0]?.total ?? 0,
		};

		return NextResponse.json(stats, {
			status: 200,
			headers: {
				// Cache for 30 s — counts don't need to be real-time on the landing page.
				"Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
			},
		});
	} catch (err) {
		console.error("[GET /api/stats]", err);
		return NextResponse.json(
			{
				totalBuses: 0,
				totalStops: 0,
				approvedOperators: 0,
				pendingComplaints: 0,
			} satisfies PlatformStats,
			{ status: 500 },
		);
	}
}
