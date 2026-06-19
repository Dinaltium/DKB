# Deployment Guide — dkbus on Vercel

The app is a stock Next.js 16 project — Vercel is the path of least resistance. Any Node 20+ host that supports Next.js works the same way.

---

## 1. Prerequisites

- A Postgres database (Supabase or Neon both work; the codebase uses `@neondatabase/serverless` which is HTTP-friendly and runs fine against Supabase too).
- A Google Cloud project for OAuth (or skip Google sign-in and rely on email/password).
- A Vercel account with the repo connected.

---

## 2. Provision the database

### Option A — Supabase (recommended going forward)

1. Create a project at [supabase.com](https://supabase.com).
2. Project Settings → Database → **Connection string** → "Transaction pooler" (port 6543) for serverless, or "Session pooler" (5432) for migrations.
3. Append `?sslmode=require` if not present.
4. Save it as `DATABASE_URL` locally (`.env.local`) and as a Vercel env var.

### Option B — Neon

Same shape — copy the **pooled** connection string from the Neon dashboard.

### Apply the schema

```bash
# From your machine, with .env.local pointing at the new DB:
pnpm db:push           # creates tables to match lib/db/schema.ts
pnpm db:seed-ts        # optional: seeds admin/operator/conductor/passenger users
```

For production CI/CD, prefer `pnpm db:generate` + `pnpm db:migrate` over `db:push` so changes are reviewed in version control. `db:push:force` is available as an escape hatch but will drop columns silently if the schema diverges — avoid in prod.

---

## 3. Environment variables

Required in **every** environment (local dev, preview, production):

| Variable | What it is | Where to get it |
|---|---|---|
| `DATABASE_URL` | Pooled Postgres connection string with `?sslmode=require` | Supabase / Neon dashboard |
| `AUTH_SECRET` | 32+ byte secret used by Auth.js to sign JWTs **and** by ticket QR HMAC | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Public origin of the deployment, e.g. `https://dkbus.vercel.app` | Vercel |

Required for Google OAuth (skip if you don't want Google sign-in):

| Variable | Notes |
|---|---|
| `AUTH_GOOGLE_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 client ID |
| `AUTH_GOOGLE_SECRET` | Same screen, the client secret |

Authorised redirect URI in Google Cloud must be: `<NEXT_PUBLIC_APP_URL>/api/auth/callback/google`.

Optional:

| Variable | Default | Use |
|---|---|---|
| `NEXT_PUBLIC_ENABLE_FAKE_MOVEMENT` | `true` | Set to `false` in prod to disable the GPS simulator |
| `AUTH_TRUST_HOST` | unset | Set to `true` when behind a proxy that's not Vercel (Auth.js v5 requirement) |

### Seed-only (development convenience — do NOT set in production)

`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_OPERATOR_*`. These are read by `scripts/seed.ts` to create local test accounts.

---

## 4. Deploy to Vercel

1. **Import the repo** in Vercel → it auto-detects Next.js. Use these settings:
   - **Build command:** `pnpm build`
   - **Install command:** `pnpm install --frozen-lockfile`
   - **Output:** leave default (`.next`)
   - **Node version:** 20.x (in Project Settings → General)
2. **Add the env vars** above for the **Production** environment. Repeat for **Preview** if you want PR previews.
3. **Connect Google OAuth redirect** — `<production-url>/api/auth/callback/google` must be in your Google Cloud authorised URIs, otherwise login will fail with `redirect_uri_mismatch`.
4. **First deploy** — push to `main`. Vercel will build, run `next build`, and deploy.

---

## 5. Post-deploy verification

After the first deploy:

```bash
# 1. App loads
curl -I https://<your-app>.vercel.app/

# 2. DB is connected
curl https://<your-app>.vercel.app/api/stats
# → {"totalBuses":N,"totalStops":N,"approvedOperators":N,"pendingComplaints":N}

# 3. Auth-gated route returns 401 without session
curl https://<your-app>.vercel.app/api/me
# → {"error":"Unauthorised"} with status 401

# 4. Sign-in works end-to-end — log in from the browser
```

If anything 500s, the Vercel function logs (Project → Deployments → Functions tab) will show the stack.

---

## 6. Go-live checklist

Before flipping a real domain to point at this app, confirm each:

- [ ] **Secrets rotated.** `AUTH_SECRET`, `DATABASE_URL` password, and Google OAuth secret are all production-only values that have never appeared in `.env.local.example` or any commit.
- [ ] **`.env.local` and `credentials.txt` are not tracked.** `git ls-files | grep -iE 'env|credentials'` returns nothing.
- [ ] **Custom domain attached** in Vercel and `NEXT_PUBLIC_APP_URL` matches it.
- [ ] **Google OAuth redirect URI** updated to the custom domain.
- [ ] **HTTPS is enforced.** Vercel does this by default — confirm the redirect works.
- [ ] **Seed accounts disabled or passwords changed.** `admin@dkbus.com / admin123` etc. must not exist in production.
- [ ] **Database backups.** Supabase has daily backups on paid plans; Neon has branch-based recovery. Verify which you're on.
- [ ] **Error monitoring.** Wire up Sentry or Vercel's built-in observability for the API routes that write data (tickets, payments, trips).
- [ ] **Rate limiting** on `/api/tickets/create` and `/api/tickets/confirm-payment`. Vercel Edge Config + Upstash Ratelimit is the standard pairing. Not yet enabled in code — add before public launch.
- [ ] **Pen-test the QR flow.** The ticket HMAC is signed with `AUTH_SECRET`; rotating that secret invalidates every outstanding ticket.
- [ ] **README, CHANGELOG, and PRIVACY policy** reflect the live URL.

---

## 7. Rolling back

Vercel keeps every deployment. To roll back: **Deployments → pick the previous one → Promote to Production.** No code change needed.

If a bad DB migration was applied, roll back the deployment **and** restore the DB from the latest Supabase/Neon backup. There is no automatic schema downgrade — `drizzle-kit` migrations are forward-only.

---

## 8. Migrating from Neon to Supabase (planned)

When you switch:

1. Create the Supabase project and grab the pooled `DATABASE_URL`.
2. Locally, point `.env.local` at Supabase and run `pnpm db:push` to create the schema. (This will be a clean DB — old `drizzle/` migration files in this repo describe the *original* schema and can be deleted or regenerated after the cutover.)
3. Export data from Neon (`pg_dump`) and import into Supabase (`psql`).
4. Update `DATABASE_URL` in Vercel.
5. Redeploy.
6. Once verified, delete the Neon project so secrets can't leak.
