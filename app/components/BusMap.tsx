"use client";

import { useEffect, useRef, useState } from "react";
import type { Stop } from "@/lib/types";

interface BusMapProps {
  stops: Stop[];
  livePosition?: { lat: number; lng: number } | null;
}

export default function BusMap({ stops, livePosition }: BusMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<unknown>(null); // L module
  const mapInstanceRef = useRef<unknown>(null); // leaflet Map instance
  const liveMarkerRef = useRef<unknown>(null); // live position marker
  const [mapReady, setMapReady] = useState(false);

  // ── Create map and static layers (runs once per stops change) ──────────────
  useEffect(() => {
    if (!mapContainerRef.current || !stops.length) return;

    let mounted = true;

    (async () => {
      const L = (await import("leaflet")).default;

      if (!mounted || !mapContainerRef.current) return;

      // Tear down previous map
      if (mapInstanceRef.current) {
        try {
          (mapInstanceRef.current as { remove: () => void }).remove();
        } catch {}
        mapInstanceRef.current = null;
        liveMarkerRef.current = null;
        leafletRef.current = null;
        setMapReady(false);
      }

      const avgLat = stops.reduce((a, s) => a + s.lat, 0) / stops.length;
      const avgLng = stops.reduce((a, s) => a + s.lng, 0) / stops.length;

      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
      }).setView([avgLat, avgLng], 15);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);

      const markerIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      const polylinePoints: [number, number][] = stops.map((s) => [
        s.lat,
        s.lng,
      ]);
      L.polyline(polylinePoints, { color: "#0E7C86", weight: 5 }).addTo(map);

      stops.forEach((stop) => {
        L.marker([stop.lat, stop.lng], { icon: markerIcon })
          .addTo(map)
          .bindPopup(`<strong>${stop.name}</strong>`);
      });

      leafletRef.current = L;
      mapInstanceRef.current = map;
      if (mounted) setMapReady(true);
    })();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        try {
          (mapInstanceRef.current as { remove: () => void }).remove();
        } catch {}
        mapInstanceRef.current = null;
        liveMarkerRef.current = null;
        leafletRef.current = null;
      }
    };
  }, [stops]);

  // ── Update live position marker whenever it changes ────────────────────────
  useEffect(() => {
    if (!mapReady || !livePosition) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = leafletRef.current as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapInstanceRef.current as any;
    if (!L || !map) return;

    const liveIcon = L.divIcon({
      html: `
        <div style="position:relative;width:24px;height:24px">
          <div class="live-ping" style="position:absolute;inset:0;border-radius:50%;background:#F4A522;"></div>
          <div style="position:absolute;inset:5px;border-radius:50%;background:#F4A522;border:2.5px solid #0D1B2A;"></div>
        </div>`,
      className: "",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    if (liveMarkerRef.current) {
      // Smoothly slide the existing marker to the new position
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (liveMarkerRef.current as any).setLatLng([
        livePosition.lat,
        livePosition.lng,
      ]);
    } else {
      liveMarkerRef.current = L.marker([livePosition.lat, livePosition.lng], {
        icon: liveIcon,
      })
        .addTo(map)
        .bindPopup("<strong>🚌 Bus is here</strong>");
    }

    // Pan the map to follow the bus smoothly
    map.panTo([livePosition.lat, livePosition.lng], {
      animate: true,
      duration: 1.2,
    });
  }, [mapReady, livePosition]);

  return (
    <div className="ticket-stub overflow-hidden rounded-lg">
      <div
        ref={mapContainerRef}
        className="h-72 w-full md:h-96"
        data-testid="bus-route-map"
      />
    </div>
  );
}
