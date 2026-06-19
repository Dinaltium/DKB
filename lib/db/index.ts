import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// We use postgres.js + drizzle-orm/postgres-js so this works against any
// vanilla Postgres — Neon, Supabase, RDS, a local container, anything that
// speaks the wire protocol on port 5432/6543.
//
// At import time we just need a syntactically valid URL so Auth.js
// DrizzleAdapter can inspect the dialect during `next build`. When
// DATABASE_URL isn't set (CI without secrets, or a first deploy that has
// not yet been configured), we fall back to a never-routable stub so the
// build still succeeds. Real queries fail at runtime with a clear network
// error.
const STUB_URL = "postgres://stub:stub@stub.invalid:5432/stub";
const url = process.env.DATABASE_URL || STUB_URL;

// `prepare: false` is required for Supabase's transaction-mode pooler
// (port 6543). It's also a safe default for serverless deployments where
// connections are short-lived. `max: 1` keeps each Vercel function
// instance to a single connection.
const client = postgres(url, {
	prepare: false,
	max: 1,
	idle_timeout: 20,
});

export const db = drizzle(client, { schema });

// Re-export schema so callers can do: import { db, users } from "@/lib/db"
export * from "./schema";
