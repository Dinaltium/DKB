// app/components/RouteTracer.tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface TracePoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface RouteTracerProps {
  busId: string;
  onSave: (points: TracePoint[]) => void;
}

export function RouteTracer({ busId, onSave }: RouteTracerProps) {
  const [tracing, setTracing] = useState(false);
  const [points, setPoints] = useState<TracePoint[]>([]);
  const [error, setError] = useState<string>("");
  const watchIdRef = useRef<number | null>(null);

  function startTrace() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device");
      return;
    }
    setPoints([]);
    setTracing(true);
    setError("");

    // Record GPS position every 5 seconds while driving
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPoints((prev) => [
          ...prev,
          {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: Date.now(),
          },
        ]);
      },
      (err) => setError(`GPS error: ${err.message}`),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      },
    );
  }

  function stopTrace() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracing(false);

    // Simplify points — keep every 5th point to reduce noise
    // while maintaining enough detail to follow the road
    const simplified = points.filter((_, idx) => idx % 5 === 0);
    onSave(simplified);

    // Save to localStorage keyed by busId
    try {
      const all = JSON.parse(
        localStorage.getItem("buslink_route_geometry") ?? "{}",
      ) as Record<string, TracePoint[]>;
      all[busId] = simplified;
      localStorage.setItem("buslink_route_geometry", JSON.stringify(all));
    } catch {}
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="rounded-lg border-2 border-slate-300 bg-white p-5">
      <p className="text-xl font-extrabold uppercase text-[#0D1B2A]">
        Route Trace — Bus {busId}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Drive the actual route while tracing. BusLink will record your exact
        path so the bus marker follows the real road.
      </p>

      {error && (
        <p className="mt-2 rounded bg-rose-50 p-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        {!tracing ? (
          <button
            onClick={startTrace}
            className="h-11 rounded-none border-2 border-[#0D1B2A] bg-[#0E7C86] px-6 
              text-sm font-bold uppercase tracking-wide text-white hover:bg-teal-700"
          >
            Start Route Trace
          </button>
        ) : (
          <button
            onClick={stopTrace}
            className="h-11 rounded-none border-2 border-[#0D1B2A] bg-rose-600 px-6 
              text-sm font-bold uppercase tracking-wide text-white hover:bg-rose-700"
          >
            Stop & Save Trace
          </button>
        )}

        {points.length > 0 && (
          <p className="text-sm text-slate-600">
            {tracing ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 animate-pulse 
                  rounded-full bg-rose-500" />
                Recording... {points.length} points captured
              </span>
            ) : (
              `✓ ${points.length} points saved`
            )}
          </p>
        )}
      </div>

      {!tracing && points.length > 0 && (
        <p className="mt-3 rounded bg-emerald-50 p-2 text-xs text-emerald-800">
          Route saved! The bus marker will now follow this exact path.
          Re-trace anytime if the route changes.
        </p>
      )}
    </div>
  );
}