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
  getPosition: (busId: string) => BusLivePosition | null;
  getGeometrySource: (busId: string) => BusState["geometrySource"] | null;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────
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

function nearestStopLabels(
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

// ── Priority 1: Load driver-traced geometry from localStorage ─────────────────
function loadDriverTrace(busId: string): RoadCoord[] | null {
  try {
    const all = JSON.parse(
      localStorage.getItem("buslink_route_geometry") ?? "{}",
    ) as Record<string, TracePoint[]>;
    const saved = all[busId];
    // Need at least 3 points to be a valid trace
    if (saved && saved.length > 2) {
      // Simplify — keep every 3rd point to reduce noise while
      // keeping enough detail to follow the road accurately
      return saved
        .filter((_, idx) => idx % 3 === 0)
        .map(({ lat, lng }) => ({ lat, lng }));
    }
  } catch {}
  return null;
}

// ── Priority 2: Fetch road geometry from OSRM ────────────────────────────────
// In-memory cache so OSRM is only called once per bus per session
const osrmCache = new Map<string, RoadCoord[]>();

async function fetchOSRMGeometry(
  busId: string,
  stopCoords: RoadCoord[],
): Promise<RoadCoord[] | null> {
  // Return cached result if available
  if (osrmCache.has(busId)) return osrmCache.get(busId)!;

  const coordStr = stopCoords.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&continue_straight=true`;

  try {
    const res = await fetch(url);
    const data = await res.json() as {
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
  } catch {
    // fall through
  }
  return null;
}

// ── Resolve geometry with priority chain ─────────────────────────────────────
// 1. Driver trace (most accurate — actual road the bus takes)
// 2. OSRM routing (good approximation)
// 3. Straight lines between stops (last resort fallback)
async function resolveGeometry(
  busId: string,
  stopCoords: RoadCoord[],
): Promise<{ coords: RoadCoord[]; source: BusState["geometrySource"] }> {
  const driverTrace = loadDriverTrace(busId);
  if (driverTrace) {
    return { coords: driverTrace, source: "driver-trace" };
  }

  const osrmCoords = await fetchOSRMGeometry(busId, stopCoords);
  if (osrmCoords) {
    return { coords: osrmCoords, source: "osrm" };
  }

  return { coords: stopCoords, source: "fallback" };
}

// ── Context ───────────────────────────────────────────────────────────────────
const LiveBusContext = createContext<LiveBusCtx>({
  getPosition: () => null,
  getGeometrySource: () => null,
});

const STARTS: Record<string, number> = {
  "MNG-101": 0.12,
  "MNG-205": 0.43,
  "UDU-310": 0.71,
};

export function LiveBusProvider({ children }: { children: React.ReactNode }) {
  const [busStates, setBusStates] = useState<Record<string, BusState>>({});
  const initializedRef = useRef(false);

  // ── Initialize all buses on mount ──────────────────────────────────────────
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

          // Resolve geometry using priority chain:
          // driver trace → OSRM → fallback straight lines
          const { coords, source } = await resolveGeometry(
            bus.id,
            stopCoords,
          );

          const segments = buildSegments(coords);
          const totalDist = routeLength(segments);
          const dist = (STARTS[bus.id] ?? 0.1) * totalDist;

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

    void initBuses();
  }, []);

  // ── Re-initialize a single bus when its driver trace is updated ────────────
  // Call this after a driver saves a new trace from the operator dashboard
  const refreshBusGeometry = async (busId: string) => {
    const bus = BUSES.find((b) => b.id === busId);
    if (!bus) return;

    // Clear OSRM cache for this bus so driver trace takes priority
    osrmCache.delete(busId);

    const stops = getStopsForRoute(bus.routeStopIds);
    const stopCoords = stops.map((s) => ({ lat: s.lat, lng: s.lng }));
    const stopNames = stops.map((s) => s.name);

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
  };

  // ── Advance each bus along its geometry every 2 seconds ───────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setBusStates((prev) => {
        const next = { ...prev };
        for (const busId of Object.keys(next)) {
          const b = { ...next[busId] };
          const STEP = 50; // meters per tick
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
  ): BusState["geometrySource"] | null => {
    return busStates[busId]?.geometrySource ?? null;
  };

  return (
    <LiveBusContext.Provider value={{ getPosition, getGeometrySource }}>
      {children}
    </LiveBusContext.Provider>
  );
}

export const useLiveBus = () => useContext(LiveBusContext);