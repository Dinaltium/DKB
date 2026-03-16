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
  panTo: (
    latlng: [number, number],
    options?: Record<string, unknown>,
  ) => void;
}

// Fetch road-following route from OSRM public API
async function fetchRoadRoute(stops: Stop[]): Promise<[number, number][]> {
  const coordStr = stops.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/foot/${coordStr}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as {
      code: string;
      routes?: {
        geometry?: {
          coordinates?: [number, number][];
        };
      }[];
    };
    if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
      // OSRM returns [lng, lat] — flip to [lat, lng] for Leaflet
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [
        lat,
        lng,
      ]);
    }
  } catch {
    // fall through to straight-line fallback
  }
  // Fallback to straight lines if OSRM fails
  return stops.map((s) => [s.lat, s.lng]);
}

export default function BusMap({ stops, livePosition }: BusMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const liveMarkerRef = useRef<LeafletMarker | null>(null);
  const routePolylineRef = useRef<LeafletPolyline | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // ── Create map and static layers ──────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !stops.length) return;

    let mounted = true;

    (async () => {
      const L = (await import("leaflet")).default;
      if (!mounted || !mapContainerRef.current) return;

      // Tear down previous map
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

      const avgLat = stops.reduce((a, s) => a + s.lat, 0) / stops.length;
      const avgLng = stops.reduce((a, s) => a + s.lng, 0) / stops.length;

      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
      }).setView([avgLat, avgLng], 11);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);

      // Stop markers — custom circle style
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

      // Draw dashed placeholder immediately
      const straightLine = stops.map((s): [number, number] => [s.lat, s.lng]);
      const polyline = L.polyline(straightLine, {
        color: "#0E7C86",
        weight: 4,
        opacity: 0.4,
        dashArray: "6 6",
      }).addTo(map);
      routePolylineRef.current = polyline as unknown as LeafletPolyline;

      // Fit map bounds to all stops
      const bounds = L.latLngBounds(straightLine);
      map.fitBounds(bounds, { padding: [30, 30] });

      leafletRef.current = L;
      mapInstanceRef.current = map as unknown as LeafletMap;
      if (mounted) setMapReady(true);

      // Fetch real road route — replaces dashed placeholder
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

  // ── Update live position marker ────────────────────────────────────────────
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
      liveMarkerRef.current = L.marker(
        [livePosition.lat, livePosition.lng],
        { icon: liveIcon },
      )
        .addTo(map as unknown as import("leaflet").Map)
        .bindPopup("<strong>🚌 Bus is here</strong>") as unknown as LeafletMarker;
    }

    map.panTo([livePosition.lat, livePosition.lng], {
      animate: true,
      duration: 1.2,
    });
  }, [mapReady, livePosition]);

  return (
    <div className="ticket-stub overflow-hidden rounded-lg">
      <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        Route follows actual NH66 road data via OpenStreetMap
      </div>
      <div
        ref={mapContainerRef}
        className="h-72 w-full md:h-96"
        data-testid="bus-route-map"
      />
    </div>
  );
}