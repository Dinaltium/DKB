import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";
import { getUserByEmail } from "@/lib/db/queries";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
	trustHost: true,
	// ── Adapter ────────────────────────────────────────────────────────────────
	// Stores users, accounts, sessions in Neon via Drizzle.
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens,
	}),

	// ── Session strategy ───────────────────────────────────────────────────────
	// JWT so it works in Vercel Edge and doesn't need a DB hit on every request.
	session: { strategy: "jwt" },

	// ── Providers ──────────────────────────────────────────────────────────────
	providers: [
		Google({
			clientId: process.env.AUTH_GOOGLE_ID!,
			clientSecret: process.env.AUTH_GOOGLE_SECRET!,
		}),

		Credentials({
			name: "Email & Password",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null;

				const user = await getUserByEmail(credentials.email as string);
				if (!user?.password) return null;

				const valid = await bcrypt.compare(
					credentials.password as string,
					user.password,
				);
				if (!valid) return null;

				return {
					id: user.id,
					name: user.name,
					email: user.email,
					image: user.image,
					role: user.role,
					mustChangePassword: user.mustChangePassword ?? false,
				};
			},
		}),
	],

	// ── Callbacks ──────────────────────────────────────────────────────────────
	callbacks: {
		// Inject role into the JWT on sign-in
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.role = (user as { role?: string }).role ?? "passenger";
				token.mustChangePassword =
					(user as { mustChangePassword?: boolean }).mustChangePassword ??
					false;
			}

			if (token.email) {
				const fresh = await getUserByEmail(token.email as string);
				if (fresh) {
					token.mustChangePassword = fresh.mustChangePassword ?? false;
					if (
						!token.roleCheckedAt ||
						Date.now() - (token.roleCheckedAt as number) > 5 * 60 * 1000
					) {
						token.role = fresh.role;
						token.id = fresh.id;
						token.roleCheckedAt = Date.now();
					}
				}
			}

			return token;
		},

		// Expose id + role on the session object so client components can read it
		async session({ session, token }) {
			if (token) {
				session.user.id = (token.id as string) ?? "";
				session.user.role =
					(token.role as "passenger" | "operator" | "admin") ?? "passenger";
				(session.user as { mustChangePassword?: boolean }).mustChangePassword =
					(token.mustChangePassword as boolean) ?? false;
			}
			return session;
		},
	},

	// ── Pages ──────────────────────────────────────────────────────────────────
	pages: {
		signIn: "/auth",
		error: "/auth",
	},
});
