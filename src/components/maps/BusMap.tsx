"use client";

import { useEffect, useRef, useState } from "react";
import type { Stop } from "@/lib/types";

interface BusMapProps {
	stops: Stop[];
	livePosition?: { lat: number; lng: number } | null;
}

interface LeafletPolyline {
	setLatLngs: (latlngs: [number, number][]) => void;
	setStyle: (style: Record<string, unknown>) => void;
	remove: () => void;
}

interface LeafletMarker {
	setLatLng: (latlng: [number, number]) => void;
	bindPopup: (content: string) => LeafletMarker;
	addTo: (map: LeafletMap) => LeafletMarker;
}

interface LeafletMap {
	remove: () => void;
	panTo: (latlng: [number, number], options?: Record<string, unknown>) => void;
	on: (event: string, handler: () => void) => void;
	off: (event: string, handler: () => void) => void;
}

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

export default function BusMap({ stops, livePosition }: BusMapProps) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const leafletRef = useRef<typeof import("leaflet") | null>(null);
	const mapInstanceRef = useRef<LeafletMap | null>(null);
	const liveMarkerRef = useRef<LeafletMarker | null>(null);
	const routePolylineRef = useRef<LeafletPolyline | null>(null);
	const [mapReady, setMapReady] = useState(false);

	// ── User pan tracking ──────────────────────────────────────────────────────
	// true  = user has manually panned away — don't auto-follow
	// false = following the bus (default)
	const userPannedRef = useRef(false);
	const [isFollowing, setIsFollowing] = useState(true);

	// ── Create map and static layers ──────────────────────────────────────────
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
				liveMarkerRef.current = null;
				routePolylineRef.current = null;
				leafletRef.current = null;
				setMapReady(false);
			}

			const map = L.map(mapContainerRef.current, {
				scrollWheelZoom: true,
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

			// ── Detect user pan/zoom — stop auto-following ─────────────────────────
			// 'dragstart' fires when user physically drags the map
			const onUserDrag = () => {
				userPannedRef.current = true;
				setIsFollowing(false);
			};
			map.on("dragstart", onUserDrag);

			// Stop markers
			stops.forEach((stop, idx) => {
				const isTerminus = idx === 0 || idx === stops.length - 1;
				const icon = L.divIcon({
					html: `<div style="
            width:${isTerminus ? 14 : 10}px;
            height:${isTerminus ? 14 : 10}px;
            border-radius:50%;
            background:${isTerminus ? "#0D1B2A" : "#0E7C86"};
            border:2.5px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,0.3)
          "></div>`,
					className: "",
					iconSize: [isTerminus ? 14 : 10, isTerminus ? 14 : 10],
					iconAnchor: [isTerminus ? 7 : 5, isTerminus ? 7 : 5],
				});
				L.marker([stop.lat, stop.lng], { icon })
					.addTo(map)
					.bindPopup(`<strong>${stop.name}</strong>`);
			});

			// Dashed placeholder polyline
			const straightLine = stops.map((s): [number, number] => [s.lat, s.lng]);
			const polyline = L.polyline(straightLine, {
				color: "#0E7C86",
				weight: 4,
				opacity: 0.4,
				dashArray: "6 6",
			}).addTo(map);
			routePolylineRef.current = polyline as unknown as LeafletPolyline;

			// Fit bounds to all stops on initial load
			const bounds = L.latLngBounds(straightLine);
			map.fitBounds(bounds, { padding: [30, 30] });

			leafletRef.current = L;
			mapInstanceRef.current = map as unknown as LeafletMap;
			if (mounted) setMapReady(true);

			// Fetch real road route
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
				liveMarkerRef.current = null;
				routePolylineRef.current = null;
				leafletRef.current = null;
			}
		};
	}, [stops]);

	// ── Update live marker — only pan if user hasn't manually moved away ───────
	useEffect(() => {
		if (!mapReady || !livePosition) return;

		const L = leafletRef.current;
		const map = mapInstanceRef.current;
		if (!L || !map) return;

		const liveIcon = L.divIcon({
			html: `
        <div style="position:relative;width:28px;height:28px">
          <div style="position:absolute;inset:0;border-radius:50%;background:#F4A52244;animation:ping 1.5s ease-in-out infinite;"></div>
          <div style="position:absolute;inset:6px;border-radius:50%;background:#F4A522;border:3px solid #0D1B2A;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>
        </div>`,
			className: "",
			iconSize: [28, 28],
			iconAnchor: [14, 14],
		});

		if (liveMarkerRef.current) {
			liveMarkerRef.current.setLatLng([livePosition.lat, livePosition.lng]);
		} else {
			liveMarkerRef.current = L.marker([livePosition.lat, livePosition.lng], {
				icon: liveIcon,
			})
				.addTo(map as unknown as import("leaflet").Map)
				.bindPopup(
					"<strong>🚌 Bus is here</strong>",
				) as unknown as LeafletMarker;
		}

		// Only auto-pan if user hasn't manually moved the map
		if (!userPannedRef.current) {
			map.panTo([livePosition.lat, livePosition.lng], {
				animate: true,
				duration: 1.2,
			});
		}
	}, [mapReady, livePosition]);

	// ── Recenter handler — called when user clicks "Back to Bus" button ────────
	const recenterOnBus = () => {
		if (!livePosition || !mapInstanceRef.current) return;
		userPannedRef.current = false;
		setIsFollowing(true);
		mapInstanceRef.current.panTo([livePosition.lat, livePosition.lng], {
			animate: true,
			duration: 0.8,
		});
	};

	return (
		<div className="ticket-stub overflow-hidden rounded-none border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
			{/* Top bar */}
			<div
				className="flex items-center justify-between border-b-2 border-foreground px-3 py-1.5"
				style={{
					background: "var(--bg-surface-2)",
					color: "var(--text-primary)",
				}}
			>
				<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
					<span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
					Route follows NH66 road data via OpenStreetMap
				</div>

				{/* Back to Bus button — only shown when user has panned away */}
				{!isFollowing && livePosition && (
					<button
						type="button"
						onClick={recenterOnBus}
						className="flex items-center gap-1.5 rounded-none border-2 border-[#0D1B2A] bg-background px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0D1B2A] shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none active:scale-95"
					>
						{/* Bus emoji as icon */}🚌 Back to Bus
					</button>
				)}

				{/* Following indicator */}
				{isFollowing && livePosition && (
					<span
						className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide"
						style={{ color: "var(--status-running-text)" }}
					>
						<span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
						Following bus
					</span>
				)}
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
