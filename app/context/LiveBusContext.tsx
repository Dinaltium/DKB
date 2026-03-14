"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { BUSES, getStopsForRoute } from "@/lib/data";

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

interface Coord {
  lat: number;
  lng: number;
  name: string;
}
interface Segment {
  from: Coord;
  to: Coord;
  length: number;
  cumStart: number;
}

function buildSegments(stops: Coord[]): Segment[] {
  const segs: Segment[] = [];
  let cum = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const len = haversineMeters(
      stops[i].lat,
      stops[i].lng,
      stops[i + 1].lat,
      stops[i + 1].lng,
    );
    segs.push({ from: stops[i], to: stops[i + 1], length: len, cumStart: cum });
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
        fromStop: seg.from.name,
        toStop: seg.to.name,
        progressPct: total > 0 ? (d / total) * 100 : 0,
      };
    }
  }
  const last = segs[segs.length - 1];
  return {
    lat: last.to.lat,
    lng: last.to.lng,
    fromStop: last.from.name,
    toStop: last.to.name,
    progressPct: 100,
  };
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
}

interface LiveBusCtx {
  getPosition: (busId: string) => BusLivePosition | null;
}

const LiveBusContext = createContext<LiveBusCtx>({ getPosition: () => null });

// Bus-specific start offsets so all 3 buses appear at different points initially
const STARTS: Record<string, number> = {
  "MNG-101": 0.12,
  "MNG-205": 0.43,
  "UDU-310": 0.71,
};

export function LiveBusProvider({ children }: { children: React.ReactNode }) {
  const [busStates, setBusStates] = useState<Record<string, BusState>>(() => {
    const init: Record<string, BusState> = {};
    for (const bus of BUSES) {
      const coords = getStopsForRoute(bus.routeStopIds).map((s) => ({
        lat: s.lat,
        lng: s.lng,
        name: s.name,
      }));
      const segments = buildSegments(coords);
      const totalDist = routeLength(segments);
      const dist = (STARTS[bus.id] ?? 0.1) * totalDist;
      init[bus.id] = { segments, totalDist, dist, heading: "forward" };
    }
    return init;
  });

  // Advance each bus 50 m every 15 seconds, reverse at endpoints
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
    return { ...pos, heading: b.heading, totalDistance: b.totalDist };
  };

  return (
    <LiveBusContext.Provider value={{ getPosition }}>
      {children}
    </LiveBusContext.Provider>
  );
}

export const useLiveBus = () => useContext(LiveBusContext);
