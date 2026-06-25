// GET /api/quick-board/trips
// Returns active/scheduled trips with their route stops so the passenger
// Quick Board page can populate the boarding-stop and destination dropdowns
// without a separate fare-table lookup round-trip.

import { db } from "@/lib/db";
import { buses, routeStops, routes, trips } from "@/lib/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
	const activeTrips = await db
		.select({
			tripId: trips.id,
			tripStatus: trips.status,
			busId: buses.id,
			busNumber: buses.number,
			routeId: routes.id,
			routeName: routes.routeName,
			origin: routes.startCity,
			destination: routes.endCity,
		})
		.from(trips)
		.innerJoin(buses, eq(buses.id, trips.busId))
		.innerJoin(routes, eq(routes.id, trips.routeId))
		.where(sql`${trips.status} IN ('scheduled', 'active')`)
		.orderBy(asc(trips.id));

	if (activeTrips.length === 0) {
		return NextResponse.json({ success: true, data: [] });
	}

	const routeIds = [...new Set(activeTrips.map((t) => t.routeId))];
	const stops = await db
		.select({
			id: routeStops.id,
			routeId: routeStops.routeId,
			stopName: routeStops.stopName,
			stopOrder: routeStops.stopOrder,
		})
		.from(routeStops)
		.where(sql`${routeStops.routeId} = ANY(${routeIds})`)
		.orderBy(asc(routeStops.stopOrder));

	const byRoute = new Map<number, typeof stops>();
	for (const s of stops) {
		const arr = byRoute.get(s.routeId) ?? [];
		arr.push(s);
		byRoute.set(s.routeId, arr);
	}

	return NextResponse.json({
		success: true,
		data: activeTrips.map((t) => ({
			...t,
			stops: byRoute.get(t.routeId) ?? [],
		})),
	});
}
