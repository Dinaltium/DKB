// types/next-auth.d.ts
// Extends Auth.js v5 default types so TypeScript knows about the extra fields
// we inject in auth.ts callbacks (id, role) and the JWT cache field.

import type { DefaultSession } from "next-auth";

// ── Session ───────────────────────────────────────────────────────────────────
declare module "next-auth" {
	interface Session {
		user: {
			id: string;
			role: "passenger" | "operator" | "conductor" | "admin";
			mustChangePassword?: boolean;
			onboarded?: boolean;
		} & DefaultSession["user"];
	}
}

// ── JWT ───────────────────────────────────────────────────────────────────────
// next-auth v5 uses a strict JWT type by default. Augment it with the custom
// fields we write in the jwt() callback so TypeScript stops complaining.
declare module "next-auth/jwt" {
	interface JWT {
		id?: string;
		role?: string;
		roleCheckedAt?: number;
		mustChangePassword?: boolean;
		onboarded?: boolean;
	}
}
