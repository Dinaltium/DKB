"use client";

import type { SimStop } from "@/lib/data";
import { createContext, useContext, useEffect, useRef, useState } from "react";

// ── Bus route descriptor returned by /api/sim-data ───────────────────────────
// NOTE: live GPS tracking has been removed. This provider now only supplies
// each bus's *expected route* — the ordered list of stops it travels through.
// No simulated movement, no position polling.
export interface SimBusFull {
	id: string;
	number: string;
	origin: string;
	destination: string;
	status: string;
	routeStopIds: string[];
}

export interface RouteStop {
	id: string;
	name: string;
	lat: number;
	lng: number;
}

interface RoutesCtx {
	/** All buses loaded from the DB (empty while loading). */
	buses: SimBusFull[];
	/** Ordered stops for a bus's expected route (empty if unknown). */
	getRouteStops: (busId: string) => RouteStop[];
}

const RoutesContext = createContext<RoutesCtx>({
	buses: [],
	getRouteStops: () => [],
});

export function LiveBusProvider({ children }: { children: React.ReactNode }) {
	const [buses, setBuses] = useState<SimBusFull[]>([]);
	const [stopsById, setStopsById] = useState<Record<string, SimStop>>({});
	const initializedRef = useRef(false);

	useEffect(() => {
		if (initializedRef.current) return;
		initializedRef.current = true;

		(async () => {
			try {
				const res = await fetch("/api/sim-data");
				const data = (await res.json()) as {
					buses: SimBusFull[];
					stops: SimStop[];
				};
				setBuses(data.buses ?? []);
				setStopsById(
					Object.fromEntries((data.stops ?? []).map((s) => [s.id, s])),
				);
			} catch (err) {
				console.error("[LiveBusProvider] Failed to load route data:", err);
			}
		})();
	}, []);

	const getRouteStops = (busId: string): RouteStop[] => {
		const bus = buses.find((b) => b.id === busId);
		if (!bus) return [];
		return bus.routeStopIds
			.map((id) => stopsById[id])
			.filter((s): s is SimStop => !!s)
			.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }));
	};

	return (
		<RoutesContext.Provider value={{ buses, getRouteStops }}>
			{children}
		</RoutesContext.Provider>
	);
}

export const useLiveBus = () => useContext(RoutesContext);
