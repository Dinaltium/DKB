"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";
import { type BusLivePosition, useLiveBus } from "@/app/context/LiveBusContext";

// ── Dynamic color palette — rotates for any number of buses ──────────────────
const COLOR_PALETTE = [
	"#F4A522",
	"#0E7C86",
	"#e05c3a",
	"#7c3aed",
	"#10b981",
	"#ef4444",
	"#3b82f6",
	"#f97316",
];

function getBusColor(index: number): string {
	return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

const STATUS_RING: Record<string, string> = {
	Running: "#22c55e",
	Delayed: "#f59e0b",
	"Not Running": "#ef4444",
};

interface MarkerBundle {
	marker: import("leaflet").Marker;
}

export default function FleetMap() {
	const router = useRouter();
	const { buses, getPosition } = useLiveBus();

	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<import("leaflet").Map | null>(null);
	const markersRef = useRef<Record<string, MarkerBundle>>({});
	const leafletRef = useRef<typeof import("leaflet") | null>(null);

	// ── Build map once on mount ──────────────────────────────────────────────
	useEffect(() => {
		let cancelled = false;

		const el = containerRef.current;
		if (!el) return;

		(async () => {
			const L = (await import("leaflet")).default;
			if (cancelled || !containerRef.current) return;

			// Destroy any existing Leaflet instance on this DOM node
			if (mapRef.current) {
				try {
					mapRef.current.remove();
				} catch {}
				mapRef.current = null;
				markersRef.current = {};
			}

			const node = containerRef.current as HTMLDivElement & {
				_leaflet_id?: number;
			};
			if (node._leaflet_id) {
				delete node._leaflet_id;
			}

			leafletRef.current = L;

			const map = L.map(containerRef.current, {
				center: [13.128, 74.817],
				zoom: 10,
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

			// Seed markers for buses that already have a position
			buses.forEach((bus, index) => {
				const pos = getPosition(bus.id);
				if (pos) {
					addMarker(
						L,
						map,
						bus.id,
						bus.number,
						bus.status,
						pos,
						getBusColor(index),
					);
				}
			});
		})();

		return () => {
			cancelled = true;
			if (mapRef.current) {
				try {
					mapRef.current.remove();
				} catch {}
				mapRef.current = null;
			}
			markersRef.current = {};
			leafletRef.current = null;
		};
	}, []);

	// ── Tick: move markers every time context re-renders ──────────────────────
	useEffect(() => {
		const L = leafletRef.current;
		const map = mapRef.current;
		if (!L || !map) return;

		buses.forEach((bus, index) => {
			const pos = getPosition(bus.id);
			if (!pos) return;

			const bundle = markersRef.current[bus.id];
			if (bundle) {
				bundle.marker.setLatLng([pos.lat, pos.lng]);
			} else {
				addMarker(
					L,
					map,
					bus.id,
					bus.number,
					bus.status,
					pos,
					getBusColor(index),
				);
			}
		});
	}, [buses, getPosition]);

	// ── Create a single bus marker ─────────────────────────────────────────────
	const addMarker = (
		L: typeof import("leaflet"),
		map: import("leaflet").Map,
		busId: string,
		busNumber: string,
		status: string,
		pos: BusLivePosition,
		fill: string,
	) => {
		if (markersRef.current[busId]) return; // Guard: don't double-add

		const ring = STATUS_RING[status] ?? "#22c55e";
		// Strip common prefixes so the label fits inside the circle
		const label = busNumber.replace(/^[A-Z]+-/, "");

		const icon = L.divIcon({
			className: "",
			iconSize: [36, 36],
			iconAnchor: [18, 18],
			html: `<div style="position:relative;width:36px;height:36px;cursor:pointer">
        <div style="position:absolute;inset:0;border-radius:50%;background:${ring}33;animation:fleet-ping 2s ease-in-out infinite"></div>
        <div style="position:absolute;inset:4px;border-radius:50%;background:${fill};border:2.5px solid #0D1B2A;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:800;color:#0D1B2A;pointer-events:none;line-height:1">${label}</div>
        <div style="position:absolute;top:1px;right:1px;width:8px;height:8px;border-radius:50%;background:${ring};border:1.5px solid #fff"></div>
      </div>`,
		});

		const tooltipHtml = `<div style="font-family:'Barlow Condensed',sans-serif;background:#0D1B2A;color:#fff;border-radius:6px;padding:6px 10px;font-size:13px;font-weight:700;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.4);pointer-events:none">
      <span style="color:${fill}">${busNumber}</span>&nbsp;·&nbsp;<span style="font-weight:400;font-size:11px">${pos.fromStop} → ${pos.toStop}</span>
      <br><span style="font-size:10px;opacity:0.7;font-weight:400">${status}</span>
    </div>`;

		const marker = L.marker([pos.lat, pos.lng], { icon })
			.addTo(map)
			.bindTooltip(tooltipHtml, {
				permanent: false,
				direction: "top",
				offset: [0, -20],
				className: "fleet-tooltip",
				opacity: 1,
			});

		marker.on("click", () => router.push(`/bus/${busId}`));

		markersRef.current[busId] = { marker };
	};

	return (
		<div className="relative overflow-hidden rounded-none border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
			{/* Map container — isolation:isolate keeps Leaflet z-indices from
          escaping the stacking context and fighting the app navbar. */}
			<div style={{ isolation: "isolate" }}>
				<div
					ref={containerRef}
					style={{ height: "420px", width: "100%" }}
					data-testid="fleet-map"
				/>
			</div>

			{/* Scoped styles */}
			<style>{`
        @keyframes fleet-ping {
          0%   { transform:scale(1);   opacity:0.7; }
          70%  { transform:scale(2.2); opacity:0;   }
          100% { transform:scale(2.2); opacity:0;   }
        }
        .fleet-tooltip { background:transparent!important; border:none!important; box-shadow:none!important; padding:0!important; }
        .fleet-tooltip .leaflet-tooltip-content { padding:0!important; }
        .fleet-tooltip::before { display:none!important; }
        [data-theme="dark"] .leaflet-tile { filter:invert(1) hue-rotate(180deg) brightness(0.82) contrast(0.9); }
        [data-theme="dark"] .leaflet-container { background:#1a2535; }
      `}</style>
		</div>
	);
}
