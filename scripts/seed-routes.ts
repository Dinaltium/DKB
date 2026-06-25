#!/usr/bin/env tsx
// scripts/seed-routes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Seeds a small set of Mangalore-area corridor routes (routes + route_stops
// + fares). Idempotent — safe to re-run after editing.
//
// Routes are independent of the "stops" search table. Each routeStops row
// carries its own stop name + lat/lng (denormalised on purpose so route
// data can drift from the global stops list without breakage).
//
// HOW TO RUN:
//   pnpm dotenv -e .env.local -- tsx scripts/seed-routes.ts
//   # production:
//   pnpm db:seed-routes:prod
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import path from "node:path";

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
		// File may not exist in CI / prod
	}
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

if (!process.env.DATABASE_URL) {
	console.error("\n[ERROR] DATABASE_URL is not set.\n");
	process.exit(1);
}

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";

const client = postgres(process.env.DATABASE_URL!, {
	prepare: false,
	max: 1,
});
const db = drizzle(client, { schema });

// ── Stop coordinate lookup (mirrors a subset of seed-stops.ts) ────────────────
// Names match what we send to route_stops.stop_name verbatim.

interface RouteStop {
	name: string;
	lat: number;
	lng: number;
}

// ── Route definitions ────────────────────────────────────────────────────────
// Ordered by what a real Mangalore corridor looks like on a map.
// Add or remove routes here — re-running the script will upsert in place.

interface RouteSpec {
	name: string;
	startCity: string;
	endCity: string;
	stops: RouteStop[];
}

const ROUTES: RouteSpec[] = [
	{
		name: "Hampankatta → Surathkal (NH-66 North)",
		startCity: "Hampankatta",
		endCity: "Surathkal",
		stops: [
			{ name: "Hampankatta", lat: 12.8691203, lng: 74.843432 },
			{ name: "K.S. Rao Road", lat: 12.870785, lng: 74.8419848 },
			{ name: "Bejai", lat: 12.8857729, lng: 74.8412105 },
			{ name: "Kavoor", lat: 12.8857729, lng: 74.8412105 },
			{ name: "Chilimbi", lat: 12.8935984, lng: 74.837515 },
			{ name: "Kunjathbail", lat: 12.9420168, lng: 74.8540408 },
			{ name: "Surathkal", lat: 12.9890235, lng: 74.8017211 },
		],
	},
	{
		name: "Hampankatta → Bajpe Aerodrome (Airport Express)",
		startCity: "Hampankatta",
		endCity: "Bajpe Aerodrome",
		stops: [
			{ name: "Hampankatta", lat: 12.8691203, lng: 74.843432 },
			{ name: "KSRTC Bus Stand", lat: 12.8846856, lng: 74.8417756 },
			{ name: "Bejai Church", lat: 12.8840049, lng: 74.846583 },
			{ name: "Kankanady", lat: 12.8646481, lng: 74.8600033 },
			{ name: "Maryhill", lat: 12.9075486, lng: 74.8631699 },
			{ name: "Padil", lat: 12.872159, lng: 74.8867594 },
			{ name: "Bajpe", lat: 12.9808517, lng: 74.8841277 },
			{ name: "Bajpe Aerodrome", lat: 12.9546178, lng: 74.8847182 },
		],
	},
	{
		name: "Hampankatta → Ullal (South Coastal)",
		startCity: "Hampankatta",
		endCity: "Ullal",
		stops: [
			{ name: "Hampankatta", lat: 12.8691203, lng: 74.843432 },
			{ name: "Pandeshwar", lat: 12.85684, lng: 74.8379984 },
			{ name: "Bengare", lat: 12.8618908, lng: 74.836454 },
			{ name: "Jeppu", lat: 12.8545047, lng: 74.8564146 },
			{ name: "Thokkottu", lat: 12.8174705, lng: 74.8452304 },
			{ name: "Ullal", lat: 12.7923655, lng: 74.8548862 },
		],
	},
	{
		name: "Hampankatta → Sasihitlu (Coast Drive)",
		startCity: "Hampankatta",
		endCity: "Sasihitlu",
		stops: [
			{ name: "Hampankatta", lat: 12.8691203, lng: 74.843432 },
			{ name: "Urwa Market", lat: 12.8890788, lng: 74.8302454 },
			{ name: "Kuloor", lat: 12.8997746, lng: 74.8261261 },
			{ name: "Baikampady", lat: 12.9492098, lng: 74.8201304 },
			{ name: "Panambur", lat: 12.9469448, lng: 74.8123039 },
			{ name: "Surathkal", lat: 12.9890235, lng: 74.8017211 },
			{ name: "Chokkabettu", lat: 12.9967761, lng: 74.8059738 },
			{ name: "Mukka", lat: 13.021575, lng: 74.7902222 },
			{ name: "Sasihitlu", lat: 13.0260878, lng: 74.7879522 },
		],
	},
	{
		name: "Hampankatta → Vamanjoor (Eastern Suburb)",
		startCity: "Hampankatta",
		endCity: "Vamanjoor",
		stops: [
			{ name: "Hampankatta", lat: 12.8691203, lng: 74.843432 },
			{ name: "Mallikatte", lat: 12.8783034, lng: 74.8553269 },
			{ name: "Kadri Temple", lat: 12.8805253, lng: 74.8543594 },
			{ name: "Kadri", lat: 12.8897288, lng: 74.8501424 },
			{ name: "Kankanady", lat: 12.8646481, lng: 74.8600033 },
			{ name: "Valencia", lat: 12.8644153, lng: 74.8583112 },
			{ name: "Padil", lat: 12.872159, lng: 74.8867594 },
			{ name: "Vamanjoor", lat: 12.8849079, lng: 74.8794308 },
		],
	},
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(
	a: { lat: number; lng: number },
	b: { lat: number; lng: number },
): number {
	const R = 6371;
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const aH =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(aH));
}

function fareForKm(km: number): number {
	// ₹2.50/km, minimum ₹10, rounded to nearest rupee.
	return Math.max(10, Math.round(km * 2.5));
}

// ── Upsert helpers ───────────────────────────────────────────────────────────

async function upsertRoute(spec: RouteSpec): Promise<number> {
	const [existing] = await db
		.select({ id: schema.routes.id })
		.from(schema.routes)
		.where(eq(schema.routes.routeName, spec.name));

	if (existing) {
		await db
			.update(schema.routes)
			.set({
				startCity: spec.startCity,
				endCity: spec.endCity,
				isActive: true,
			})
			.where(eq(schema.routes.id, existing.id));
		return existing.id;
	}

	const [inserted] = await db
		.insert(schema.routes)
		.values({
			routeName: spec.name,
			startCity: spec.startCity,
			endCity: spec.endCity,
			isActive: true,
		})
		.returning({ id: schema.routes.id });
	return inserted.id;
}

async function upsertStops(
	routeId: number,
	stops: RouteStop[],
): Promise<number[]> {
	const ids: number[] = [];
	for (let i = 0; i < stops.length; i++) {
		const s = stops[i];
		const [row] = await db
			.insert(schema.routeStops)
			.values({
				routeId,
				stopName: s.name,
				stopOrder: i,
				latitude: s.lat.toFixed(7),
				longitude: s.lng.toFixed(7),
			})
			.onConflictDoUpdate({
				target: [schema.routeStops.routeId, schema.routeStops.stopOrder],
				set: {
					stopName: s.name,
					latitude: s.lat.toFixed(7),
					longitude: s.lng.toFixed(7),
				},
			})
			.returning({ id: schema.routeStops.id });
		ids.push(row.id);
	}
	return ids;
}

async function upsertFares(
	routeId: number,
	stopIds: number[],
	stops: RouteStop[],
): Promise<number> {
	let count = 0;
	for (let i = 0; i < stops.length; i++) {
		for (let j = i + 1; j < stops.length; j++) {
			const km = haversineKm(stops[i], stops[j]);
			const fare = fareForKm(km);
			await db
				.insert(schema.fares)
				.values({
					routeId,
					fromStopId: stopIds[i],
					toStopId: stopIds[j],
					fareInr: fare.toFixed(2),
				})
				.onConflictDoUpdate({
					target: [
						schema.fares.routeId,
						schema.fares.fromStopId,
						schema.fares.toStopId,
					],
					set: { fareInr: fare.toFixed(2), updatedAt: new Date() },
				});
			count++;
		}
	}
	return count;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
	const maskedUrl = process.env.DATABASE_URL?.replace(/:([^@]+)@/, ":***@");
	console.log("\nBusLink — Route seed script");
	console.log("─".repeat(60));
	console.log(`Database : ${maskedUrl}`);
	console.log(`Routes   : ${ROUTES.length}`);
	console.log("");

	let totalStops = 0;
	let totalFares = 0;

	try {
		for (const spec of ROUTES) {
			const routeId = await upsertRoute(spec);
			const stopIds = await upsertStops(routeId, spec.stops);
			const fareCount = await upsertFares(routeId, stopIds, spec.stops);

			totalStops += stopIds.length;
			totalFares += fareCount;

			console.log(
				`  ✓ #${routeId} ${spec.name}  (${stopIds.length} stops, ${fareCount} fares)`,
			);
		}

		console.log(
			`\nDone. ${ROUTES.length} routes, ${totalStops} stops, ${totalFares} fares seeded.\n`,
		);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("does not exist")) {
			console.error(
				"\n[ERROR] The routes / route_stops / fares tables do not exist.\n" +
					"        Run 'pnpm db:push' first to create the schema.\n",
			);
		} else {
			console.error("\n[ERROR]", err);
		}
		process.exit(1);
	}
}

main()
	.then(() => client.end())
	.catch(async (err) => {
		console.error(err);
		await client.end();
		process.exit(1);
	});
