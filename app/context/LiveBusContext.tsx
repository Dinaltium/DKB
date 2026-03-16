"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { BUSES, getStopsForRoute } from "@/lib/data";

// ── Haversine distance in meters ──────────────────────────────────────────────
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
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

interface RoadCoord {
  lat: number;
  lng: number;
}

interface Segment {
  from: RoadCoord;
  to: RoadCoord;
  length: number;
  cumStart: number;
}

// Build segments from any array of coords (works for both stop coords and road coords)
function buildSegments(coords: RoadCoord[]): Segment[] {
  const segs: Segment[] = [];
  let cum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const len = haversineMeters(
      coords[i].lat, coords[i].lng,
      coords[i + 1].lat, coords[i + 1].lng,
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

function positionAt(
  segs: Segment[],
  dist: number,
): { lat: number; lng: number; progressPct: number } {
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

// Fetch real road geometry from OSRM
async function fetchRoadCoords(
  stopCoords: RoadCoord[],
): Promise<RoadCoord[]> {
  const coordStr = stopCoords.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json() as {
      code: string;
      routes?: { geometry?: { coordinates?: [number, number][] } }[];
    };
    if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => ({
        lat,
        lng,
      }));
    }
  } catch {
    // fall through to straight-line fallback
  }
  return stopCoords;
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
  // stop names kept for UI display
  stopNames: string[];
}

interface LiveBusCtx {
  getPosition: (busId: string) => BusLivePosition | null;
}

const LiveBusContext = createContext<LiveBusCtx>({ getPosition: () => null });

const STARTS: Record<string, number> = {
  "MNG-101": 0.12,
  "MNG-205": 0.43,
  "UDU-310": 0.71,
};

// Find which stop segment the bus is nearest to for fromStop/toStop labels
function nearestStopLabels(
  stopCoords: RoadCoord[],
  stopNames: string[],
  progressPct: number,
): { fromStop: string; toStop: string } {
  const idx = Math.floor((progressPct / 100) * (stopNames.length - 1));
  const safeIdx = Math.max(0, Math.min(idx, stopNames.length - 2));
  return {
    fromStop: stopNames[safeIdx] ?? stopNames[0] ?? "",
    toStop: stopNames[safeIdx + 1] ?? stopNames[stopNames.length - 1] ?? "",
  };
}

export function LiveBusProvider({ children }: { children: React.ReactNode }) {
  const [busStates, setBusStates] = useState<Record<string, BusState>>({});
  const initializedRef = useRef(false);

  // ── Fetch road geometry for all buses on mount ──────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function initBuses() {
      const init: Record<string, BusState> = {};

      await Promise.all(
        BUSES.map(async (bus) => {
          const stops = getStopsForRoute(bus.routeStopIds);
          const stopCoords: RoadCoord[] = stops.map((s) => ({
            lat: s.lat,
            lng: s.lng,
          }));
          const stopNames = stops.map((s) => s.name);

          // Fetch real road geometry from OSRM
          const roadCoords = await fetchRoadCoords(stopCoords);
          const segments = buildSegments(roadCoords);
          const totalDist = routeLength(segments);
          const dist = (STARTS[bus.id] ?? 0.1) * totalDist;

          init[bus.id] = {
            segments,
            totalDist,
            dist,
            heading: "forward",
            stopNames,
          };
        }),
      );

      setBusStates(init);
    }

    void initBuses();
  }, []);

  // ── Advance each bus 50m every 2 seconds along the road geometry ──────────
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
      b.segments.map((s) => s.from),
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

  return (
    <LiveBusContext.Provider value={{ getPosition }}>
      {children}
    </LiveBusContext.Provider>
  );
}

export const useLiveBus = () => useContext(LiveBusContext);