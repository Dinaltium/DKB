"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { SimStop } from "@/lib/data";

// ── Lightweight bus descriptor returned by /api/sim-data ──────────────────────
export interface SimBusFull {
	id: string;
	number: string;
	origin: string;
	destination: string;
	status: string;
	routeStopIds: string[];
}

// ── Haversine distance in meters ──────────────────────────────────────────────
function haversineMeters(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number {
	const R = 6371000;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface RoadCoord {
	lat: number;
	lng: number;
}

interface TracePoint {
	lat: number;
	lng: number;
	timestamp: number;
}

interface Segment {
	from: RoadCoord;
	to: RoadCoord;
	length: number;
	cumStart: number;
}

export interface BusLivePosition {
	lat: number;
	lng: number;
	fromStop: string;
	toStop: string;
	progressPct: number;
	heading: "forward" | "reverse";
	totalDistance: number;
}

interface BusState {
	segments: Segment[];
	totalDist: number;
	dist: number;
	heading: "forward" | "reverse";
	stopNames: string[];
	geometrySource: "driver-trace" | "osrm" | "fallback";
}

interface LiveBusCtx {
	/** All buses loaded from the DB (empty while loading). */
	buses: SimBusFull[];
	getPosition: (busId: string) => BusLivePosition | null;
	getGeometrySource: (busId: string) => BusState["geometrySource"] | null;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────
function buildSegments(coords: RoadCoord[]): Segment[] {
	const segs: Segment[] = [];
	let cum = 0;
	for (let i = 0; i < coords.length - 1; i++) {
		const len = haversineMeters(
			coords[i].lat,
			coords[i].lng,
			coords[i + 1].lat,
			coords[i + 1].lng,
		);
		segs.push({
			from: coords[i],
			to: coords[i + 1],
			length: len,
			cumStart: cum,
		});
		cum += len;
	}
	return segs;
}

function routeLength(segs: Segment[]): number {
	if (!segs.length) return 0;
	const last = segs[segs.length - 1];
	return last.cumStart + last.length;
}

function positionAt(segs: Segment[], dist: number) {
	const total = routeLength(segs);
	const d = Math.max(0, Math.min(dist, total));
	for (const seg of segs) {
		if (d >= seg.cumStart && d <= seg.cumStart + seg.length) {
			const t = seg.length > 0 ? (d - seg.cumStart) / seg.length : 0;
			return {
				lat: seg.from.lat + (seg.to.lat - seg.from.lat) * t,
				lng: seg.from.lng + (seg.to.lng - seg.from.lng) * t,
				progressPct: total > 0 ? (d / total) * 100 : 0,
			};
		}
	}
	const last = segs[segs.length - 1];
	return { lat: last.to.lat, lng: last.to.lng, progressPct: 100 };
}

function nearestStopLabels(stopNames: string[], progressPct: number) {
	const idx = Math.floor((progressPct / 100) * (stopNames.length - 1));
	const safeIdx = Math.max(0, Math.min(idx, stopNames.length - 2));
	return {
		fromStop: stopNames[safeIdx] ?? stopNames[0] ?? "",
		toStop: stopNames[safeIdx + 1] ?? stopNames[stopNames.length - 1] ?? "",
	};
}

// ── Priority 1: driver-traced geometry from localStorage ─────────────────────
function loadDriverTrace(busId: string): RoadCoord[] | null {
	try {
		const all = JSON.parse(
			localStorage.getItem("buslink_route_geometry") ?? "{}",
		) as Record<string, TracePoint[]>;
		const saved = all[busId];
		if (saved && saved.length > 2) {
			return saved
				.filter((_, i) => i % 3 === 0)
				.map(({ lat, lng }) => ({ lat, lng }));
		}
	} catch {}
	return null;
}

// ── Priority 2: OSRM road geometry ───────────────────────────────────────────
const osrmCache = new Map<string, RoadCoord[]>();

async function fetchOSRMGeometry(
	busId: string,
	stopCoords: RoadCoord[],
): Promise<RoadCoord[] | null> {
	if (osrmCache.has(busId)) return osrmCache.get(busId)!;
	const coordStr = stopCoords.map((s) => `${s.lng},${s.lat}`).join(";");
	const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&continue_straight=true`;
	try {
		const res = await fetch(url);
		const data = (await res.json()) as {
			code: string;
			routes?: { geometry?: { coordinates?: [number, number][] } }[];
		};
		if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
			const coords = data.routes[0].geometry.coordinates.map(
				([lng, lat]: [number, number]) => ({ lat, lng }),
			);
			osrmCache.set(busId, coords);
			return coords;
		}
	} catch {}
	return null;
}

async function resolveGeometry(
	busId: string,
	stopCoords: RoadCoord[],
): Promise<{ coords: RoadCoord[]; source: BusState["geometrySource"] }> {
	const driverTrace = loadDriverTrace(busId);
	if (driverTrace) return { coords: driverTrace, source: "driver-trace" };
	const osrmCoords = await fetchOSRMGeometry(busId, stopCoords);
	if (osrmCoords) return { coords: osrmCoords, source: "osrm" };
	return { coords: stopCoords, source: "fallback" };
}

// ── Stable pseudo-random start offset based on bus ID ────────────────────────
// Gives each bus a different starting position on the route so they don't all
// appear at the same point on first render. The hash is deterministic so HMR
// doesn't cause jumps.
function getStartOffset(busId: string): number {
	let hash = 0;
	for (let i = 0; i < busId.length; i++) {
		hash = (hash << 5) - hash + busId.charCodeAt(i);
		hash |= 0; // Convert to 32-bit int
	}
	return ((Math.abs(hash) % 90) + 5) / 100; // Range: 0.05 – 0.94
}

// ── Context ───────────────────────────────────────────────────────────────────
const LiveBusContext = createContext<LiveBusCtx>({
	buses: [],
	getPosition: () => null,
	getGeometrySource: () => null,
});

export function LiveBusProvider({ children }: { children: React.ReactNode }) {
	const [buses, setBuses] = useState<SimBusFull[]>([]);
	const [busStates, setBusStates] = useState<Record<string, BusState>>({});
	const initializedRef = useRef(false);

	// ── Step 1: Fetch buses + stops from the DB via /api/sim-data ─────────────
	useEffect(() => {
		if (initializedRef.current) return;
		initializedRef.current = true;

		async function initSimulation() {
			let simBuses: SimBusFull[] = [];
			let stopsMap: Record<string, SimStop> = {};

			try {
				const res = await fetch("/api/sim-data");
				const data = (await res.json()) as {
					buses: SimBusFull[];
					stops: SimStop[];
				};

				simBuses = data.buses ?? [];
				stopsMap = Object.fromEntries((data.stops ?? []).map((s) => [s.id, s]));
			} catch (err) {
				console.error("[LiveBusProvider] Failed to load sim data:", err);
				return;
			}

			setBuses(simBuses);

			// ── Step 2: Build initial simulation state for each bus ───────────────
			const init: Record<string, BusState> = {};

			await Promise.all(
				simBuses.map(async (bus) => {
					// Resolve SimStop[] for this bus's route (preserving order).
					const simStops: SimStop[] = bus.routeStopIds
						.map((id) => stopsMap[id])
						.filter((s): s is SimStop => !!s);

					if (simStops.length < 2) return; // Skip buses with incomplete route data

					const stopCoords = simStops.map((s) => ({ lat: s.lat, lng: s.lng }));
					const stopNames = simStops.map((s) => s.name);

					const { coords, source } = await resolveGeometry(bus.id, stopCoords);
					const segments = buildSegments(coords);
					const totalDist = routeLength(segments);
					const dist = getStartOffset(bus.id) * totalDist;

					init[bus.id] = {
						segments,
						totalDist,
						dist,
						heading: "forward",
						stopNames,
						geometrySource: source,
					};
				}),
			);

			setBusStates(init);
		}

		void initSimulation();
	}, []);

	// ── Re-initialize a bus after driver saves a new traced route ─────────────
	const _refreshBusGeometry = async (busId: string) => {
		const bus = buses.find((b) => b.id === busId);
		if (!bus) return;

		// Re-fetch stops from the API to get fresh coordinates.
		try {
			const res = await fetch("/api/sim-data");
			const data = (await res.json()) as {
				buses: SimBusFull[];
				stops: SimStop[];
			};
			const stopsMap = Object.fromEntries(
				(data.stops ?? []).map((s) => [s.id, s]),
			);

			osrmCache.delete(busId);

			const simStops = bus.routeStopIds
				.map((id) => stopsMap[id])
				.filter((s): s is SimStop => !!s);
			const stopCoords = simStops.map((s) => ({ lat: s.lat, lng: s.lng }));
			const stopNames = simStops.map((s) => s.name);

			const { coords, source } = await resolveGeometry(busId, stopCoords);
			const segments = buildSegments(coords);
			const totalDist = routeLength(segments);

			setBusStates((prev) => ({
				...prev,
				[busId]: {
					...prev[busId],
					segments,
					totalDist,
					geometrySource: source,
					stopNames,
				},
			}));
		} catch (err) {
			console.error("[LiveBusProvider] refreshBusGeometry failed:", err);
		}
	};

	// ── Advance each bus 50 m every 2 seconds ─────────────────────────────────
	useEffect(() => {
		const id = setInterval(() => {
			setBusStates((prev) => {
				const next = { ...prev };
				for (const busId of Object.keys(next)) {
					const b = { ...next[busId] };
					const STEP = 50;
					if (b.heading === "forward") {
						b.dist = Math.min(b.dist + STEP, b.totalDist);
						if (b.dist >= b.totalDist) b.heading = "reverse";
					} else {
						b.dist = Math.max(b.dist - STEP, 0);
						if (b.dist <= 0) b.heading = "forward";
					}
					next[busId] = b;
				}
				return next;
			});
		}, 2000);
		return () => clearInterval(id);
	}, []);

	const getPosition = (busId: string): BusLivePosition | null => {
		const b = busStates[busId];
		if (!b?.segments.length) return null;
		const pos = positionAt(b.segments, b.dist);
		const { fromStop, toStop } = nearestStopLabels(
			b.stopNames,
			pos.progressPct,
		);
		return {
			...pos,
			fromStop,
			toStop,
			heading: b.heading,
			totalDistance: b.totalDist,
		};
	};

	const getGeometrySource = (
		busId: string,
	): BusState["geometrySource"] | null =>
		busStates[busId]?.geometrySource ?? null;

	return (
		<LiveBusContext.Provider value={{ buses, getPosition, getGeometrySource }}>
			{children}
		</LiveBusContext.Provider>
	);
}

export const useLiveBus = () => useContext(LiveBusContext);
