import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// neon() needs a syntactically valid Postgres URL at import time so that
// Auth.js DrizzleAdapter can inspect the dialect during module evaluation
// (this runs during `next build`, even on machines that have no real DB).
//
// In a real environment DATABASE_URL is set. When it isn't (CI without
// secrets configured, first Vercel deploy without env vars, etc.) we fall
// back to a never-reachable stub so the build succeeds. Actual queries
// will still fail at runtime with a clear network error, which is the
// behaviour we want.
const STUB_URL = "postgres://stub:stub@stub.invalid:5432/stub";
const sql = neon(process.env.DATABASE_URL || STUB_URL);

export const db = drizzle(sql, { schema });

// Re-export schema so callers can do: import { db, users } from "@/lib/db"
export * from "./schema";
