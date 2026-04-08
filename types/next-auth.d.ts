// types/next-auth.d.ts
// Extends Auth.js v5 default types so TypeScript knows about the extra fields
// we inject in auth.ts callbacks (id, role) and the JWT cache field.

import { DefaultSession } from "next-auth";

// ── Session ───────────────────────────────────────────────────────────────────
declare module "next-auth" {
	interface Session {
		user: {
			id: string;
			role: "passenger" | "operator" | "admin";
			mustChangePassword?: boolean;
		} & DefaultSession["user"];
	}
}

// ── JWT ───────────────────────────────────────────────────────────────────────
// next-auth v5 uses a strict JWT type by default. Augment it with the custom
// fields we write in the jwt() callback so TypeScript stops complaining.
declare module "next-auth/jwt" {
	interface JWT {
		/** Database UUID of the authenticated user */
		id?: string;
		/** Role stored in the users table */
		role?: string;
		/** Timestamp (ms) of the last role re-check against the DB */
		roleCheckedAt?: number;
		/** Whether forced password change is required */
		mustChangePassword?: boolean;
	}
}
