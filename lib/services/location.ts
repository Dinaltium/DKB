// lib/services/location.ts
// Geocoding and distance calculations
// Ported from BusLink's server/services/locationService.js → TypeScript

/**
 * Calculate the Haversine distance between two coordinates in kilometers.
 */
export function distanceBetween(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const R = 6371; // Earth radius in km
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Geocode a stop name to coordinates using Nominatim (OpenStreetMap).
 * Scoped to Karnataka, India.
 */
export async function getCoordinates(
	stopName: string,
): Promise<{ latitude: number; longitude: number } | null> {
	try {
		const query = encodeURIComponent(`${stopName},Karnataka,India`);
		const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
		const response = await fetch(url, {
			headers: {
				"User-Agent": "BusLink/2.0",
				"Accept-Language": "en",
			},
		});
		if (!response.ok) return null;
		const data = (await response.json()) as Array<{ lat: string; lon: string }>;
		if (!data.length) return null;
		return {
			latitude: Number.parseFloat(Number.parseFloat(data[0].lat).toFixed(7)),
			longitude: Number.parseFloat(Number.parseFloat(data[0].lon).toFixed(7)),
		};
	} catch (err) {
		console.error("[Geocode Error]", err);
		return null;
	}
}

/**
 * Filter and sort trips by proximity to a traveller's location.
 */
export interface TripWithStops {
	id: number;
	stops: Array<{
		stopName: string;
		latitude: string | null;
		longitude: string | null;
		[key: string]: unknown;
	}>;
	[key: string]: unknown;
}

export interface NearbyStop {
	stopName: string;
	distanceKm: number;
	[key: string]: unknown;
}

export interface NearbyTrip extends TripWithStops {
	nearestStop: NearbyStop;
}

export function findNearbyTrips(
	trips: TripWithStops[],
	travLat: number,
	travLng: number,
	maxDistanceKm = 5,
): NearbyTrip[] {
	return trips
		.map((trip) => {
			const stopsWithDistance = (trip.stops ?? []).map((stop) => {
				if (!stop.latitude || !stop.longitude) {
					return { ...stop, distanceKm: 999 };
				}
				const dist = distanceBetween(
					travLat,
					travLng,
					Number.parseFloat(stop.latitude),
					Number.parseFloat(stop.longitude),
				);
				return { ...stop, distanceKm: Number.parseFloat(dist.toFixed(2)) };
			});

			const nearestStop = stopsWithDistance
				.filter((s) => s.distanceKm <= maxDistanceKm)
				.sort((a, b) => a.distanceKm - b.distanceKm)[0];

			if (!nearestStop) return null;

			return {
				...trip,
				nearestStop: {
					stopName: nearestStop.stopName,
					distanceKm: nearestStop.distanceKm,
				},
				stops: stopsWithDistance,
			} as NearbyTrip;
		})
		.filter((t): t is NearbyTrip => t !== null)
		.sort((a, b) => a.nearestStop.distanceKm - b.nearestStop.distanceKm);
}
