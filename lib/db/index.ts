import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// neon() returns a tagged-template SQL executor backed by Neon's HTTP API.
// drizzle() wraps it with the full ORM query builder.
// This module is imported by server actions and API routes only — never
// shipped to the browser.

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });

// Re-export schema so callers can do: import { db, users } from "@/lib/db"
export * from "./schema";
