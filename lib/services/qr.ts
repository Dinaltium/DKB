// lib/services/qr.ts
// QR code generation, ticket UIDs, pass UIDs, conductor codes
// Ported from BusLink's server/services/qrService.js → TypeScript + Drizzle

import crypto from "node:crypto";
import { db } from "@/lib/db";
import { conductorAccess, passes, tickets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Generate an HMAC-based ticket hash for QR code verification.
 */
export function generateTicketHash(
	ticketUid: string,
	tripId: number,
	userId: string | null,
): string {
	// Prefer a dedicated ticket-signing key; fall back to AUTH_SECRET.
	const secret = process.env.TICKET_HMAC_KEY ?? process.env.AUTH_SECRET;
	if (!secret) {
		throw new Error(
			"TICKET_HMAC_KEY / AUTH_SECRET is not set — cannot sign ticket",
		);
	}
	return crypto
		.createHmac("sha256", secret)
		.update(`${ticketUid}:${tripId}:${userId ?? "guest"}`)
		.digest("hex");
}

/**
 * Generate a unique ticket UID like "BL-MAN-20260611-A3X9".
 * Checks the DB to ensure uniqueness.
 */
export async function generateTicketUID(
	fromStopCode?: string,
): Promise<string> {
	const prefix = `BL-${(fromStopCode ?? "BUS").slice(0, 3).toUpperCase()}`;
	const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

	let uid: string;
	let exists: boolean;
	do {
		const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
		uid = `${prefix}-${date}-${rand}`;
		const rows = await db
			.select({ id: tickets.id })
			.from(tickets)
			.where(eq(tickets.ticketUid, uid));
		exists = rows.length > 0;
	} while (exists);

	return uid;
}

/**
 * Generate a unique pass UID like "BL-SP-20260611-4829".
 */
export async function generatePassUID(
	passType: "student" | "monthly",
): Promise<string> {
	const prefix = passType === "student" ? "BL-SP" : "BL-MP";
	const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

	let uid: string;
	let exists: boolean;
	do {
		const rand = Math.floor(1000 + Math.random() * 9000);
		uid = `${prefix}-${date}-${rand}`;
		const rows = await db
			.select({ id: passes.id })
			.from(passes)
			.where(eq(passes.passUid, uid));
		exists = rows.length > 0;
	} while (exists);

	return uid;
}

/**
 * Generate a unique conductor code like "CN-4829".
 */
export async function generateConductorCode(): Promise<string> {
	let code: string;
	let exists: boolean;
	do {
		const rand = Math.floor(1000 + Math.random() * 9000);
		code = `CN-${rand}`;
		const rows = await db
			.select({ id: conductorAccess.id })
			.from(conductorAccess)
			.where(eq(conductorAccess.conductorCode, code));
		exists = rows.length > 0;
	} while (exists);

	return code;
}

/**
 * Generate a bus QR code URL.
 */
export function generateBusQRUrl(registrationNumber: string): string {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
	const slug = registrationNumber.replace(/\s+/g, "-").toUpperCase();
	return `${baseUrl}/bus/${slug}`;
}
