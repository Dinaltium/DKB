// lib/services/crypto.ts
// Reversible field-level encryption for PII at rest (Aadhaar, driving licence,
// RC, PUC, insurance, etc.). Uses AES-256-GCM with a key derived from
// AUTH_SECRET. Admins need to read these values back for verification, so this
// is encryption (reversible), not hashing.
//
// Stored format:  enc:v1:<ivB64>:<tagB64>:<cipherB64>
// decrypt() is tolerant: a value that isn't in this format is returned as-is,
// so rows written before encryption was introduced still display correctly and
// no data migration is required.

import crypto from "node:crypto";

const PREFIX = "enc:v1:";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
	if (cachedKey) return cachedKey;
	// Prefer a dedicated PII key; fall back to AUTH_SECRET for backward compat.
	// Rotating this key requires re-encrypting existing rows (see MEMORY note).
	const secret = process.env.PII_ENC_KEY ?? process.env.AUTH_SECRET;
	if (!secret) {
		throw new Error(
			"PII_ENC_KEY / AUTH_SECRET is not set — cannot encrypt/decrypt PII",
		);
	}
	// Deterministic 32-byte key derived from the secret.
	cachedKey = crypto.scryptSync(secret, "dkbus-pii-v1", 32);
	return cachedKey;
}

/** Encrypt a sensitive string. Passes through null/empty unchanged. */
export function encryptPII<T extends string | null | undefined>(value: T): T {
	if (value === null || value === undefined || value === "") return value;
	// Already encrypted — don't double-wrap.
	if (typeof value === "string" && value.startsWith(PREFIX)) return value;

	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
	const enc = Buffer.concat([
		cipher.update(value as string, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString(
		"base64",
	)}` as T;
}

/** Decrypt a value produced by encryptPII. Non-encrypted input is returned as-is. */
export function decryptPII<T extends string | null | undefined>(value: T): T {
	if (typeof value !== "string" || !value.startsWith(PREFIX)) return value;
	try {
		const [, , ivB64, tagB64, dataB64] = value.split(":");
		const iv = Buffer.from(ivB64, "base64");
		const tag = Buffer.from(tagB64, "base64");
		const data = Buffer.from(dataB64, "base64");
		const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
		decipher.setAuthTag(tag);
		const dec = Buffer.concat([decipher.update(data), decipher.final()]);
		return dec.toString("utf8") as T;
	} catch {
		// Corrupt/undecryptable — never throw into a render path.
		return null as T;
	}
}

// ── Object-level helpers for the two PII-bearing tables ──────────────────────

const OPERATOR_PII = [
	"aadhar",
	"drivingLicense",
	"rcNumber",
	"pollutionCertNo",
	"insurancePolicyNo",
] as const;

const BUS_REQUEST_PII = [
	"operatorAadhaar",
	"operatorLicense",
	"rcNumber",
	"pollutionCertNumber",
	"insurancePolicyNumber",
] as const;

function mapFields<T extends Record<string, unknown>>(
	obj: T | null | undefined,
	fields: readonly string[],
	fn: (v: string | null | undefined) => string | null | undefined,
): T | null | undefined {
	if (!obj) return obj;
	const out = { ...obj } as Record<string, unknown>;
	for (const f of fields) {
		if (f in out) out[f] = fn(out[f] as string | null | undefined);
	}
	return out as T;
}

export const decryptOperatorPII = <T extends Record<string, unknown>>(op: T) =>
	mapFields(op, OPERATOR_PII, decryptPII) as T;

export const decryptBusRequestPII = <T extends Record<string, unknown>>(r: T) =>
	mapFields(r, BUS_REQUEST_PII, decryptPII) as T;
