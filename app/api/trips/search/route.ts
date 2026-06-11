import { searchTripsAction } from "@/lib/actions/trips";
import { findNearbyTrips } from "@/lib/services/location";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const from = searchParams.get("from") || undefined;
	const to = searchParams.get("to") || undefined;
	const latStr = searchParams.get("lat");
	const lngStr = searchParams.get("lng");

	const res = await searchTripsAction({ from, to });
	if (!res.success || !res.data) {
		return NextResponse.json(
			{ success: false, error: (res as any).error },
			{ status: 400 },
		);
	}

	let data: any[] = res.data;

	// Support proximity filter if lat/lng are provided
	if (latStr && lngStr) {
		const lat = Number.parseFloat(latStr);
		const lng = Number.parseFloat(lngStr);
		if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
			// Adapt trips data structure for findNearbyTrips
			const tripsForLocation = data.map((t) => ({
				id: t.id,
				stops: t.stops.map((s: any) => ({
					stopName: s.stopName,
					latitude: s.latitude,
					longitude: s.longitude,
				})),
				...t,
			}));
			// Find nearby trips (max 5km range)
			data = findNearbyTrips(tripsForLocation, lat, lng, 5);
		}
	}

	return NextResponse.json({ success: true, data });
}
