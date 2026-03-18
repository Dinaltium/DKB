// lib/db/fare.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure fare-calculation helper — no DB call, safe to import from both
// server components (e.g. app/bus/[id]/page.tsx) and server actions.
//
// The identical implementation also lives in lib/data.ts for client-side use
// (search page). Both stay in sync manually; if you change the formula here,
// change it there too.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the fare between two stops on a route.
 *
 * @param fullFare   - The full end-to-end fare for the bus (in ₹)
 * @param fromIdx    - Zero-based index of the boarding stop in the route
 * @param toIdx      - Zero-based index of the alighting stop in the route
 * @param totalStops - Total number of stops on the route
 * @returns Fare in whole rupees (minimum ₹5)
 */
export function calcFare(
  fullFare: number,
  fromIdx: number,
  toIdx: number,
  totalStops: number,
): number {
  const steps = Math.abs(toIdx - fromIdx);
  if (steps === 0 || totalStops <= 1) return 0;
  return Math.max(5, Math.ceil((steps / (totalStops - 1)) * fullFare));
}
