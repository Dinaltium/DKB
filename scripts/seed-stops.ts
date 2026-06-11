#!/usr/bin/env tsx
// scripts/seed-stops.ts
// ──────────────────────────────────────────────────────────────────────────────
// Seeds the stops table with all Mangalore bus stop locations sourced from
// locations_with_coords.json (geocoded via Nominatim/OpenStreetMap).
//
// HOW TO RUN:
//   npx tsx --env-file=.env.local scripts/seed-stops.ts
//   or add to package.json: "db:seed-stops": "tsx scripts/seed-stops.ts"
//
// IDEMPOTENT: Uses ON CONFLICT DO UPDATE — safe to re-run at any time.
// Existing stops will have their name/lat/lng refreshed.
// ──────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import path from "node:path";

// Load .env.local manually (same pattern as scripts/seed.ts)
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
		// File may not exist in CI — DATABASE_URL should already be set
	}
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

if (!process.env.DATABASE_URL) {
	console.error(
		"\n[ERROR] DATABASE_URL is not set.\n" +
			"        Add it to .env.local or pass inline:\n" +
			"        DATABASE_URL=... npx tsx scripts/seed-stops.ts\n",
	);
	process.exit(1);
}

import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";

const client = neon(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// ── Stop data ──────────────────────────────────────────────────────────────────
// Source: locations_with_coords.json
// Fields used: url_slug → id, location_name → name, lat, lng
// UUIDs from source JSON are stored in comments only; the DB uses url_slug as PK.

const STOPS: { id: string; name: string; lat: number; lng: number }[] = [
	{ id: "adyar", name: "Adyar", lat: 12.8683434, lng: 74.9310047 },
	{ id: "bajpe", name: "Bajpe", lat: 12.9808517, lng: 74.8841277 },
	{ id: "hampankatta", name: "Hampankatta", lat: 12.8691203, lng: 74.843432 },
	{ id: "jokatte", name: "Jokatte", lat: 12.9605751, lng: 74.8442917 },
	{ id: "kaikamba", name: "Kaikamba", lat: 12.9939439, lng: 74.8348033 },
	{ id: "kana", name: "Kana", lat: 12.9806013, lng: 74.8172073 },
	{ id: "kodikal", name: "Kodikal", lat: 12.9074593, lng: 74.8297538 },
	{ id: "kunjathbail", name: "Kunjathbail", lat: 12.9420168, lng: 74.8540408 },
	{ id: "mrpl", name: "MRPL", lat: 12.9892788, lng: 74.8309479 },
	{
		id: "marnamikatta",
		name: "Marnamikatta",
		lat: 12.8527191,
		lng: 74.8516075,
	},
	{ id: "mukka", name: "Mukka", lat: 13.021575, lng: 74.7902222 },
	{ id: "state-bank", name: "State Bank", lat: 12.8626976, lng: 74.8365413 },
	{
		id: "sulthan-battery",
		name: "Sulthan Battery",
		lat: 12.8897236,
		lng: 74.8215995,
	},
	{ id: "surathkal", name: "Surathkal", lat: 12.9890235, lng: 74.8017211 },
	{ id: "urwa-market", name: "Urwa Market", lat: 12.8890788, lng: 74.8302454 },
	{ id: "alake", name: "Alake", lat: 12.8736233, lng: 74.833866 },
	{ id: "attavar", name: "Attavar", lat: 12.860548, lng: 74.8480626 },
	{ id: "baikampady", name: "Baikampady", lat: 12.9492098, lng: 74.8201304 },
	{
		id: "bajpe-aerodrome",
		name: "Bajpe Aerodrome",
		lat: 12.9546178,
		lng: 74.8847182,
	},
	{ id: "balmatta", name: "Balmatta", lat: 12.8791877, lng: 74.8584005 },
	{ id: "bejai", name: "Bejai", lat: 12.8857729, lng: 74.8412105 },
	{ id: "bejai-church", name: "Bejai Church", lat: 12.8840049, lng: 74.846583 },
	{ id: "bengare", name: "Bengare", lat: 12.8618908, lng: 74.836454 },
	{ id: "bhatrakere", name: "Bhatrakere", lat: 12.9961008, lng: 74.8865088 },
	{ id: "bokkapatna", name: "Bokkapatna", lat: 12.8790089, lng: 74.827776 },
	{ id: "bolar", name: "Bolar", lat: 12.8468042, lng: 74.8430182 },
	{ id: "boloor", name: "Boloor", lat: 12.8866121, lng: 74.8247716 },
	{ id: "bondel", name: "Bondel", lat: 12.9262123, lng: 74.8584061 },
	{
		id: "bunts-hostel",
		name: "Bunts Hostel",
		lat: 12.8764943,
		lng: 74.8479289,
	},
	{
		id: "canara-college",
		name: "Canara College",
		lat: 12.8788605,
		lng: 74.8417948,
	},
	{ id: "car-street", name: "Car Street", lat: 12.8702004, lng: 74.8366794 },
	{ id: "chilimbi", name: "Chilimbi", lat: 12.8935984, lng: 74.837515 },
	{ id: "chokkabettu", name: "Chokkabettu", lat: 12.9967761, lng: 74.8059738 },
	{ id: "dombel", name: "Dombel", lat: 12.903011, lng: 74.8232353 },
	{ id: "empire-mall", name: "Empire Mall", lat: 12.879568, lng: 74.8406548 },
	{ id: "falnir", name: "Falnir", lat: 12.8688855, lng: 74.8479308 },
	{ id: "gurupura", name: "Gurupura", lat: 12.9382816, lng: 74.9279894 },
	{ id: "hosabettu", name: "Hosabettu", lat: 12.962852, lng: 74.7985323 },
	{ id: "jm-road", name: "J.M. Road", lat: 12.8791191, lng: 74.8409182 },
	{ id: "jeppu", name: "Jeppu", lat: 12.8545047, lng: 74.8564146 },
	{ id: "jyothi", name: "Jyothi", lat: 12.8688855, lng: 74.8479308 },
	{ id: "ks-rao-road", name: "K.S. Rao Road", lat: 12.870785, lng: 74.8419848 },
	{ id: "kpt", name: "KPT", lat: 12.8918834, lng: 74.853987 },
	{
		id: "ksrtc-bus-stand",
		name: "KSRTC Bus Stand",
		lat: 12.8846856,
		lng: 74.8417756,
	},
	{ id: "kadri", name: "Kadri", lat: 12.8897288, lng: 74.8501424 },
	{
		id: "kadri-temple",
		name: "Kadri Temple",
		lat: 12.8805253,
		lng: 74.8543594,
	},
	{ id: "kankanady", name: "Kankanady", lat: 12.8646481, lng: 74.8600033 },
	{ id: "katipalla", name: "Katipalla", lat: 13.0004744, lng: 74.8310401 },
	{ id: "kavoor", name: "Kavoor", lat: 12.8857729, lng: 74.8412105 },
	{ id: "kotekar", name: "Kotekar", lat: 12.9137869, lng: 74.8561886 },
	{ id: "kottara", name: "Kottara", lat: 12.902033, lng: 74.8368503 },
	{
		id: "kottara-chowki",
		name: "Kottara Chowki",
		lat: 12.9102126,
		lng: 74.8363056,
	},
	{ id: "kudroli", name: "Kudroli", lat: 12.8765518, lng: 74.8302397 },
	{ id: "kudupu", name: "Kudupu", lat: 12.8849079, lng: 74.8794308 },
	{ id: "kuloor", name: "Kuloor", lat: 12.8997746, lng: 74.8261261 },
	{ id: "ladyhill", name: "Ladyhill", lat: 12.8883693, lng: 74.8373673 },
	{ id: "mallikatte", name: "Mallikatte", lat: 12.8783034, lng: 74.8553269 },
	{ id: "mangaladevi", name: "Mangaladevi", lat: 12.8492308, lng: 74.8452609 },
	{ id: "mangalapete", name: "Mangalapete", lat: 12.9937922, lng: 74.8389932 },
	{
		id: "mangalore-junction",
		name: "Mangalore Junction",
		lat: 12.866628,
		lng: 74.8792308,
	},
	{
		id: "mangalore-university",
		name: "Mangalore University",
		lat: 12.8650148,
		lng: 74.8410816,
	},
	{ id: "mannagudda", name: "Mannagudda", lat: 12.8819149, lng: 74.8353565 },
	{ id: "maroli", name: "Maroli", lat: 12.8753585, lng: 74.8798521 },
	{ id: "maryhill", name: "Maryhill", lat: 12.9075486, lng: 74.8631699 },
	{ id: "mulihitlu", name: "Mulihitlu", lat: 12.8453185, lng: 74.8471599 },
	{ id: "nagori", name: "Nagori", lat: 12.8699595, lng: 74.8745171 },
	{ id: "nanthoor", name: "Nanthoor", lat: 12.8847697, lng: 74.8607701 },
	{ id: "natekal", name: "Natekal", lat: 12.8020234, lng: 74.9037226 },
	{ id: "neermarga", name: "Neermarga", lat: 12.8932996, lng: 74.9096665 },
	{ id: "pvs", name: "PVS", lat: 12.8738292, lng: 74.8408795 },
	{ id: "padil", name: "Padil", lat: 12.872159, lng: 74.8867594 },
	{
		id: "padil-railway-station",
		name: "Padil Railway Station",
		lat: 12.8752966,
		lng: 74.894361,
	},
	{ id: "panambur", name: "Panambur", lat: 12.9469448, lng: 74.8123039 },
	{ id: "pandeshwar", name: "Pandeshwar", lat: 12.85684, lng: 74.8379984 },
	{ id: "pumpwell", name: "Pumpwell", lat: 12.8696153, lng: 74.86606 },
	{
		id: "saibeen-complex",
		name: "Saibeen Complex",
		lat: 12.8852147,
		lng: 74.8394237,
	},
	{ id: "saripalla", name: "Saripalla", lat: 12.8849079, lng: 74.8794308 },
	{ id: "sasihitlu", name: "Sasihitlu", lat: 13.0260878, lng: 74.7879522 },
	{ id: "soorinje", name: "Soorinje", lat: 13.0243211, lng: 74.8392103 },
	{ id: "talapady", name: "Talapady", lat: 12.7673913, lng: 74.8697907 },
	{
		id: "tannirbhavi-beach",
		name: "Tannirbhavi Beach",
		lat: 12.9003749,
		lng: 74.8130662,
	},
	{ id: "thokkottu", name: "Thokkottu", lat: 12.8174705, lng: 74.8452304 },
	{ id: "ullal", name: "Ullal", lat: 12.7923655, lng: 74.8548862 },
	{ id: "urwa-store", name: "Urwa Store", lat: 12.8896482, lng: 74.8334844 },
	{ id: "valencia", name: "Valencia", lat: 12.8644153, lng: 74.8583112 },
	{ id: "vamanjoor", name: "Vamanjoor", lat: 12.8849079, lng: 74.8794308 },
	{ id: "yemmekere", name: "Yemmekere", lat: 12.8499951, lng: 74.8411897 },
	{ id: "yeyyadi", name: "Yeyyadi", lat: 12.8979468, lng: 74.861564 },
];

async function main() {
	const maskedUrl = process.env.DATABASE_URL?.replace(/:([^@]+)@/, ":***@");
	console.log("\nBusLink — Stop seed script");
	console.log("─".repeat(60));
	console.log(`Database : ${maskedUrl}`);
	console.log(
		`Stops    : ${STOPS.length} locations from locations_with_coords.json`,
	);
	console.log("");

	try {
		// Upsert in batches of 20 to avoid hitting query size limits
		const BATCH = 20;
		let inserted = 0;

		for (let i = 0; i < STOPS.length; i += BATCH) {
			const batch = STOPS.slice(i, i + BATCH);
			await db
				.insert(schema.stops)
				.values(batch)
				.onConflictDoUpdate({
					target: schema.stops.id,
					set: {
						name: sql`excluded.name`,
						lat: sql`excluded.lat`,
						lng: sql`excluded.lng`,
					},
				});
			inserted += batch.length;
			console.log(`  ✓ ${inserted}/${STOPS.length} stops upserted`);
		}

		console.log(`\nDone. ${STOPS.length} stops seeded successfully.\n`);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("does not exist")) {
			console.error(
				"\n[ERROR] The stops table does not exist.\n" +
					"        Run 'pnpm db:push' first to create the schema.\n",
			);
		} else {
			console.error("\n[ERROR]", err);
		}
		process.exit(1);
	}
}

main();
