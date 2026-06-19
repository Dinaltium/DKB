// Standalone migration script: add users.onboarded_at column.
// Drizzle-kit push would also try to apply the in-flight loyalty/cashback
// drops in the same run, which is destructive and needs review. This script
// just lands the additive change so the onboarding flow can ship.
//
// Usage: pnpm tsx --env-file=.env.local scripts/add-onboarded-column.ts

import { sql } from "drizzle-orm";
import { db } from "../lib/db";

async function main() {
	console.log("Adding users.onboarded_at column (idempotent)…");
	await db.execute(
		sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at timestamp`,
	);
	// Treat every existing user as already onboarded so this is a no-op for them.
	const result = await db.execute(
		sql`UPDATE users SET onboarded_at = NOW() WHERE onboarded_at IS NULL AND (name IS NOT NULL OR phone IS NOT NULL)`,
	);
	// postgres-js exposes `.count`, neon-http exposes `.rowCount` — handle both.
	const n =
		(result as unknown as { rowCount?: number; count?: number }).rowCount ??
		(result as unknown as { rowCount?: number; count?: number }).count ??
		0;
	console.log(`Backfilled ${n} existing user(s).`);
	console.log("Done.");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
