// app/api/sim-data/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Public GET endpoint consumed by LiveBusContext on the client to seed the
// GPS simulation without hardcoded bus/stop arrays.
//
// Returns:
//   {
//     buses: { id, number, origin, destination, status, routeStopIds }[],
//     stops: { id, name, lat, lng }[]
//   }
//
// Marked force-dynamic so Next.js never statically caches it — bus status and
// route data can change at any time.
// ─────────────────────────────────────────────────────────────────────────────

import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buses, busRoutes, stops } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
	try {
		// Run the three lightweight queries in parallel.
		const [allBuses, allRoutes, allStops] = await Promise.all([
			db
				.select({
					id: buses.id,
					number: buses.number,
					origin: buses.origin,
					destination: buses.destination,
					status: buses.status,
				})
				.from(buses)
				.orderBy(asc(buses.number)),

			db
				.select({
					busId: busRoutes.busId,
					stopId: busRoutes.stopId,
				})
				.from(busRoutes)
				.orderBy(asc(busRoutes.busId), asc(busRoutes.stopOrder)),

			db
				.select({
					id: stops.id,
					name: stops.name,
					lat: stops.lat,
					lng: stops.lng,
				})
				.from(stops),
		]);

		// Group route stop IDs by bus ID (already ordered by stopOrder).
		const routesByBusId: Record<string, string[]> = {};
		for (const r of allRoutes) {
			if (!routesByBusId[r.busId]) routesByBusId[r.busId] = [];
			routesByBusId[r.busId].push(r.stopId);
		}

		const busesWithRoutes = allBuses.map((bus) => ({
			...bus,
			routeStopIds: routesByBusId[bus.id] ?? [],
		}));

		return NextResponse.json(
			{ buses: busesWithRoutes, stops: allStops },
			{
				status: 200,
				headers: {
					// Allow a short browser cache (5 s) so rapid re-mounts don't spam
					// the DB, while still reflecting fresh data quickly.
					"Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
				},
			},
		);
	} catch (err) {
		console.error("[GET /api/sim-data]", err);
		return NextResponse.json({ buses: [], stops: [] }, { status: 500 });
	}
}
