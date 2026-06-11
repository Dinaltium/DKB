// lib/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// All domain types (Bus, Stop, Operator, Complaint, Payment, etc.) are now
// inferred directly from the Drizzle schema in lib/db/schema.ts.
//
// UI-only types and convenience aliases live here.
// ─────────────────────────────────────────────────────────────────────────────

export type Language = "en" | "kn" | "tcy" | "be";

// ── Bus status ────────────────────────────────────────────────────────────────
// Mirrors the busStatusEnum values in lib/db/schema.ts.
// Use this type anywhere you need to reference bus status outside of Drizzle.
export type BusStatus = "Running" | "Not Running" | "Delayed";

// Re-export DB types for convenience so existing imports don't all break at once.
// Gradually migrate callers to import directly from "@/lib/db/schema" instead.
export type {
	Bus,
	Complaint,
	LoyaltyAccount,
	Operator,
	Payment,
	Stop,
	TravelHistory,
	User,
} from "@/lib/db/schema";
