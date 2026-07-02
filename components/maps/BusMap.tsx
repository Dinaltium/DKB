"use client";

import type { Stop } from "@/lib/types";
import { useEffect, useRef } from "react";

interface BusMapProps {
	stops: Stop[];
}

interface LeafletPolyline {
	setLatLngs: (latlngs: [number, number][]) => void;
	setStyle: (style: Record<string, unknown>) => void;
}

interface LeafletMap {
	remove: () => void;
}

// Road-following geometry through the stops; straight-line fallback on failure.
async function fetchRoadRoute(stops: Stop[]): Promise<[number, number][]> {
	const coordStr = stops.map((s) => `${s.lng},${s.lat}`).join(";");
	const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&continue_straight=true`;
	try {
		const res = await fetch(url);
		const data = (await res.json()) as {
			code: string;
			routes?: { geometry?: { coordinates?: [number, number][] } }[];
		};
		if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
			return data.routes[0].geometry.coordinates.map(([lng, lat]) => [
				lat,
				lng,
			]);
		}
	} catch {}
	return stops.map((s) => [s.lat, s.lng]);
}

export default function BusMap({ stops }: BusMapProps) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<LeafletMap | null>(null);
	const routePolylineRef = useRef<LeafletPolyline | null>(null);

	useEffect(() => {
		if (!mapContainerRef.current || !stops.length) return;

		let mounted = true;

		(async () => {
			const L = (await import("leaflet")).default;
			if (!mounted || !mapContainerRef.current) return;

			if (mapInstanceRef.current) {
				try {
					mapInstanceRef.current.remove();
				} catch {}
				mapInstanceRef.current = null;
				routePolylineRef.current = null;
			}

			const map = L.map(mapContainerRef.current, { scrollWheelZoom: true });

			L.tileLayer(
				"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
				{
					attribution:
						'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
					subdomains: "abcd",
					maxZoom: 19,
				},
			).addTo(map);

			// Ordered stop markers
			stops.forEach((stop, idx) => {
				const isTerminus = idx === 0 || idx === stops.length - 1;
				const icon = L.divIcon({
					html: `<div style="
            width:${isTerminus ? 14 : 10}px;
            height:${isTerminus ? 14 : 10}px;
            border-radius:50%;
            background:${isTerminus ? "var(--color-navy)" : "var(--color-teal)"};
            border:2.5px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,0.3)
          "></div>`,
					className: "",
					iconSize: [isTerminus ? 14 : 10, isTerminus ? 14 : 10],
					iconAnchor: [isTerminus ? 7 : 5, isTerminus ? 7 : 5],
				});
				L.marker([stop.lat, stop.lng], { icon })
					.addTo(map)
					.bindPopup(`<strong>${idx + 1}. ${stop.name}</strong>`);
			});

			// Dashed placeholder until road geometry loads
			const straightLine = stops.map((s): [number, number] => [s.lat, s.lng]);
			const polyline = L.polyline(straightLine, {
				color: "var(--color-teal)",
				weight: 4,
				opacity: 0.4,
				dashArray: "6 6",
			}).addTo(map);
			routePolylineRef.current = polyline as unknown as LeafletPolyline;

			map.fitBounds(L.latLngBounds(straightLine), { padding: [30, 30] });

			mapInstanceRef.current = map as unknown as LeafletMap;

			const roadPoints = await fetchRoadRoute(stops);
			if (mounted && routePolylineRef.current) {
				routePolylineRef.current.setLatLngs(roadPoints);
				routePolylineRef.current.setStyle({
					opacity: 1,
					dashArray: undefined,
					weight: 5,
				});
			}
		})();

		return () => {
			mounted = false;
			if (mapInstanceRef.current) {
				try {
					mapInstanceRef.current.remove();
				} catch {}
				mapInstanceRef.current = null;
				routePolylineRef.current = null;
			}
		};
	}, [stops]);

	return (
		<div className="ticket-stub overflow-hidden rounded-none border-2 border-foreground neo-shadow">
			<div
				className="flex items-center gap-2 border-b-2 border-foreground px-3 py-1.5"
				style={{
					background: "var(--bg-surface-2)",
					color: "var(--text-primary)",
				}}
			>
				<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
					<span className="theme-bg-teal inline-block h-2 w-2 rounded-full" />
					Expected route along NH66 road data via OpenStreetMap
				</div>
			</div>

			<div style={{ isolation: "isolate" }}>
				<div
					ref={mapContainerRef}
					className="h-72 w-full md:h-96"
					data-testid="bus-route-map"
				/>
			</div>
		</div>
	);
}
