#!/usr/bin/env tsx

// scripts/seed.ts
// -----------------------------------------------------------------------------
// Seeds ONLY what you explicitly provide via environment variables.
//
// This project should not ship hardcoded demo credentials or data. To seed initial
// users, set the env vars below in `.env.local` (or export them) and run:
//   pnpm db:push
//   pnpm db:seed-ts
//
// Admin:
//   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME (optional)
//
// Optional operator:
//   SEED_OPERATOR_EMAIL, SEED_OPERATOR_PASSWORD, SEED_OPERATOR_COMPANY,
//   SEED_OPERATOR_PHONE (optional), SEED_OPERATOR_APPROVED ("true" | "false")
// -----------------------------------------------------------------------------

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// -- Load .env.local without dotenv -------------------------------------------
function loadEnvFile(filePath: string) {
	try {
		const lines = readFileSync(filePath, "utf-8").split("\n");
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const eqIdx = trimmed.indexOf("=");
			if (eqIdx === -1) continue;
			const key = trimmed.slice(0, eqIdx).trim();
			let val = trimmed.slice(eqIdx + 1).trim();
			if (
				(val.startsWith('"') && val.endsWith('"')) ||
				(val.startsWith("'") && val.endsWith("'"))
			) {
				val = val.slice(1, -1);
			}
			if (!process.env[key]) process.env[key] = val;
		}
	} catch {
		// File may not exist in CI environments where DATABASE_URL is already set.
	}
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

// -- Validate environment -----------------------------------------------------
if (!process.env.DATABASE_URL) {
	console.error(
		"\n[ERROR] DATABASE_URL is not set.\n" +
			"        Add it to .env.local or pass it inline:\n" +
			"        DATABASE_URL=... npx tsx scripts/seed.ts\n",
	);
	process.exit(1);
}

// -- Imports (after env is loaded) --------------------------------------------
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function log(msg: string) {
	console.log(`  ${msg}`);
}

function logSeparator() {
	console.log(`  ${"-".repeat(60)}`);
}

async function hashPassword(plain: string): Promise<string> {
	return bcrypt.hash(plain, 12);
}

// -----------------------------------------------------------------------------
// Seed functions
// -----------------------------------------------------------------------------

async function seedAdmin() {
	const email = process.env.SEED_ADMIN_EMAIL?.trim();
	const password = process.env.SEED_ADMIN_PASSWORD;
	const name = (process.env.SEED_ADMIN_NAME || "Admin").trim();

	if (!email || !password) return false;

	console.log("\nAdmin user");
	logSeparator();

	const id = randomUUID();
	const hashed = await hashPassword(password);

	await db
		.insert(schema.users)
		.values({ id, name, email, password: hashed, role: "admin" })
		.onConflictDoUpdate({
			target: schema.users.email,
			set: { name, password: hashed, role: "admin", updatedAt: new Date() },
		});

	await db
		.insert(schema.loyaltyAccounts)
		.values({ userId: id })
		.onConflictDoNothing();

	log(`Email : ${email}`);
	log(`Role  : admin`);
	return true;
}

async function seedOperators() {
	const email = process.env.SEED_OPERATOR_EMAIL?.trim();
	const password = process.env.SEED_OPERATOR_PASSWORD;
	const companyName = process.env.SEED_OPERATOR_COMPANY?.trim();

	if (!email || !password || !companyName) return false;

	console.log("\nOperator user");
	logSeparator();

	const userId = randomUUID();
	const operatorId = randomUUID();
	const phone = process.env.SEED_OPERATOR_PHONE?.trim() || null;
	const approved =
		(process.env.SEED_OPERATOR_APPROVED || "false").toLowerCase() === "true";

	const hashed = await hashPassword(password);

	await db
		.insert(schema.users)
		.values({
			id: userId,
			name: companyName,
			email,
			password: hashed,
			role: "operator",
		})
		.onConflictDoUpdate({
			target: schema.users.email,
			set: {
				name: companyName,
				password: hashed,
				role: "operator",
				updatedAt: new Date(),
			},
		});

	await db
		.insert(schema.operators)
		.values({
			id: operatorId,
			userId,
			companyName,
			phone,
			approved,
		})
		.onConflictDoUpdate({
			target: schema.operators.id,
			set: {
				companyName,
				phone,
				approved,
				updatedAt: new Date(),
			},
		});

	await db
		.insert(schema.loyaltyAccounts)
		.values({ userId })
		.onConflictDoNothing();

	log(`Company : ${companyName}`);
	log(`Email   : ${email}`);
	log(`Status  : ${approved ? "approved" : "pending approval"}`);
	return true;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
	const maskedUrl = process.env.DATABASE_URL?.replace(/:([^@]+)@/, ":***@");
	console.log("\nBusLink seed script");
	logSeparator();
	console.log(`  Database : ${maskedUrl}`);
	console.log(`  Note     : Run 'pnpm db:push' first if tables do not exist.`);

	try {
		const didAdmin = await seedAdmin();
		const didOperator = await seedOperators();

		if (!didAdmin && !didOperator) {
			console.log(
				"\nNo seed env vars provided. Nothing to seed.\n" +
					"Set SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD and/or\n" +
					"SEED_OPERATOR_EMAIL/SEED_OPERATOR_PASSWORD/SEED_OPERATOR_COMPANY and retry.\n",
			);
			return;
		}
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("does not exist")) {
			console.error(
				"\n[ERROR] Database tables are missing.\n" +
					"        Run 'pnpm db:push' to create the schema, then retry.\n",
			);
		} else {
			console.error("\n[ERROR]", err);
		}
		process.exit(1);
	}

	console.log("\nSeed complete.");
	console.log("");
}

main();
