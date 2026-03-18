import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { getUserByEmail } from "@/lib/db/queries";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
        if (!user || !user.password) return null;

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
      }

      // On subsequent requests the DB user record may have been updated
      // (e.g. admin promotes someone to operator). Re-read role every ~5 min.
      if (
        !token.roleCheckedAt ||
        Date.now() - (token.roleCheckedAt as number) > 5 * 60 * 1000
      ) {
        const fresh = await getUserByEmail(token.email as string);
        if (fresh) {
          token.role = fresh.role;
          token.id = fresh.id;
          token.roleCheckedAt = Date.now();
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
