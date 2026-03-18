// lib/data.ts
// ─────────────────────────────────────────────────────────────────────────────
// Static seed data used ONLY by LiveBusContext for the GPS simulation.
// Everything else (buses, stops, operators) is now fetched from Neon.
//
// DO NOT import BUSES or STOPS anywhere except LiveBusContext.tsx.
// DO NOT add credentials, BUS_MAP, OPERATOR_MAP back here.
// ─────────────────────────────────────────────────────────────────────────────

// Local type — intentionally separate from Drizzle's Bus type.
// LiveBusContext only needs id + routeStopIds for simulation.
export interface SimStop {
  id:   string;
  name: string;
  lat:  number;
  lng:  number;
}

export interface SimBus {
  id:           string;
  routeStopIds: string[];
}


// Pure fare calculation — also exported from lib/db/fare.ts for server use.
// Kept here so the search page can use it client-side without a DB call.
export function calcFare(
  fullFare:   number,
  fromIdx:    number,
  toIdx:      number,
  totalStops: number,
): number {
  const steps = Math.abs(toIdx - fromIdx);
  if (steps === 0) return 0;
  return Math.max(5, Math.ceil((steps / (totalStops - 1)) * fullFare));
}