"use client";

import { type RouteStop, useLiveBus } from "@/app/context/LiveBusContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// ── Dynamic color palette — rotates for any number of buses ──────────────────
const COLOR_PALETTE = [
	"var(--color-amber)",
	"var(--color-teal)",
	"hsl(var(--primary))",
	"hsl(var(--success))",
	"hsl(var(--destructive))",
	"hsl(var(--info))",
];

function getBusColor(index: number): string {
	return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

// Fetch road-following geometry for a set of stops; falls back to straight
// lines between stops if the routing service is unavailable.
async function fetchRoadRoute(stops: RouteStop[]): Promise<[number, number][]> {
	if (stops.length < 2) return stops.map((s) => [s.lat, s.lng]);
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

export default function FleetMap() {
	const router = useRouter();
	const { buses, getRouteStops } = useLiveBus();

	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<import("leaflet").Map | null>(null);

	useEffect(() => {
		let cancelled = false;
		const el = containerRef.current;
		if (!el || buses.length === 0) return;

		(async () => {
			const L = (await import("leaflet")).default;
			if (cancelled || !containerRef.current) return;

			if (mapRef.current) {
				try {
					mapRef.current.remove();
				} catch {}
				mapRef.current = null;
			}
			const node = containerRef.current as HTMLDivElement & {
				_leaflet_id?: number;
			};
			if (node._leaflet_id) node._leaflet_id = undefined;

			const map = L.map(containerRef.current, {
				center: [13.128, 74.817],
				zoom: 11,
				scrollWheelZoom: true,
				zoomControl: true,
			});

			L.tileLayer(
				"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
				{
					attribution:
						'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
					subdomains: "abcd",
					maxZoom: 19,
				},
			).addTo(map);

			mapRef.current = map;

			const allPoints: [number, number][] = [];

			await Promise.all(
				buses.map(async (bus, index) => {
					const stops = getRouteStops(bus.id);
					if (stops.length < 2) return;
					const color = getBusColor(index);

					const road = await fetchRoadRoute(stops);
					if (cancelled || !mapRef.current) return;
					for (const p of road) allPoints.push(p);

					const line = L.polyline(road, {
						color,
						weight: 4,
						opacity: 0.85,
					}).addTo(map);
					line.bindTooltip(
						`<strong>${bus.number}</strong> · ${bus.origin} → ${bus.destination}`,
						{ sticky: true },
					);
					line.on("click", () => router.push(`/bus/${bus.id}`));

					// Terminus markers only — keeps the overview readable.
					[stops[0], stops[stops.length - 1]].forEach((stop) => {
						const icon = L.divIcon({
							className: "",
							iconSize: [12, 12],
							iconAnchor: [6, 6],
							html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2.5px solid var(--color-navy);box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
						});
						L.marker([stop.lat, stop.lng], { icon })
							.addTo(map)
							.bindTooltip(`<strong>${stop.name}</strong>`, {
								direction: "top",
							});
					});
				}),
			);

			if (!cancelled && mapRef.current && allPoints.length > 1) {
				try {
					map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
				} catch {}
			}
		})();

		return () => {
			cancelled = true;
			if (mapRef.current) {
				try {
					mapRef.current.remove();
				} catch {}
				mapRef.current = null;
			}
		};
	}, [buses, getRouteStops, router]);

	return (
		<div className="relative overflow-hidden rounded-none border-2 border-foreground neo-shadow">
			<div
				className="flex items-center gap-2 border-b-2 border-foreground px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
				style={{
					background: "var(--bg-surface-2)",
					color: "var(--text-primary)",
				}}
			>
				<span className="theme-bg-teal inline-block h-2 w-2 rounded-full" />
				Expected routes · tap a line for bus details
			</div>
			<div style={{ isolation: "isolate" }}>
				<div
					ref={containerRef}
					style={{ height: "420px", width: "100%" }}
					data-testid="fleet-map"
				/>
			</div>
			<style>{`
        [data-theme="dark"] .leaflet-tile { filter:invert(1) hue-rotate(180deg) brightness(0.82) contrast(0.9); }
        [data-theme="dark"] .leaflet-container { background:var(--bg-surface); }
      `}</style>
		</div>
	);
}
