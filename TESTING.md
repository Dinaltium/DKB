# Testing Guide — dkbus

This project has three test layers. They all share `.env.local` for configuration.

| Layer | Tool | Location | Command |
|---|---|---|---|
| Unit & component | [Vitest](https://vitest.dev) + Testing Library | `tests/unit/`, `tests/component/` | `pnpm test:run` |
| End-to-end (e2e) | [Playwright](https://playwright.dev) | `tests/e2e/` | `pnpm test:e2e` |
| Static / typecheck | TypeScript + Biome | n/a | `pnpm typecheck && pnpm lint` |

---

## 1. One-time setup

```bash
pnpm install
pnpm exec playwright install --with-deps chromium   # browsers for e2e
```

Make sure `.env.local` exists with at least:

```dotenv
DATABASE_URL=postgres://...
AUTH_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

A throwaway test database is strongly preferred — the e2e suite writes real rows.

---

## 2. Unit & component tests (Vitest)

Run once and exit (CI mode):

```bash
pnpm test:run
```

Watch mode while developing:

```bash
pnpm test
```

Run a single file or filter by name:

```bash
pnpm test:run -- tests/unit/fare.test.ts
pnpm test:run -- -t "calculates discount"
```

Coverage report:

```bash
pnpm test:run -- --coverage
```

Where to put new tests:

- Pure functions → `tests/unit/<feature>.test.ts`
- React components → `tests/component/<Component>.test.tsx`
- Anything that talks to the DB → see the e2e section below; do **not** mock the DB in unit tests.

---

## 3. End-to-end tests (Playwright)

Run the full suite (auto-starts `pnpm dev` if nothing's on port 3000):

```bash
pnpm test:e2e
```

Run a single spec or one test:

```bash
pnpm test:e2e tests/e2e/auth.test.ts
pnpm test:e2e -g "passenger can book a ticket"
```

Debug interactively (opens a browser + step-through UI):

```bash
pnpm test:e2e --debug
pnpm test:e2e --ui          # Playwright UI mode
```

After a run, open the HTML report:

```bash
pnpm exec playwright show-report
```

### Test accounts

Playwright tests use the seeded accounts from `scripts/seed.ts`. Seed first:

```bash
pnpm db:push          # ensure schema is current
pnpm db:seed-ts       # creates admin@dkbus.com, operator@dkbus.com, etc.
```

Default credentials live in `.env.local` under the `SEED_*` keys (never commit real ones).

### Common flows worth covering

- Auth: each role can sign in and lands on the right dashboard.
- Conductor: activate trip → advance stop → end trip → revenue report.
- Operator: create trip → see it in passenger search.
- Passenger: search → book → confirm payment → ticket appears in `/api/tickets/my`.
- Middleware: anonymous user hitting `/conductor` or `/admin` is redirected.

---

## 4. Typecheck & lint

```bash
pnpm typecheck   # tsc --noEmit, strict
pnpm lint        # biome lint --write
pnpm check       # biome format + lint + import sort
```

`pnpm build` runs `tsc` as part of the Next.js build, so a green build implies a green typecheck.

---

## 5. CI

GitHub Actions runs on every push and PR. See `.github/workflows/ci.yml`.

The matrix is:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm typecheck`
4. `pnpm test:run`
5. `pnpm build`
6. `pnpm test:e2e` (only on `main` and PRs targeting `main`)

The e2e job needs the same env vars as local dev — add them as GitHub Actions secrets (`AUTH_SECRET`, `DATABASE_URL`, etc.).

---

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| `EADDRINUSE :::3000` during e2e | Another dev server is already running. Stop it or set `PORT=3001` and update `playwright.config.ts`. |
| `AUTH_SECRET is not set` thrown from `qr.ts` | Add `AUTH_SECRET` to `.env.local`. The fallback default was removed for security. |
| Vitest hangs on the OCR test | `tesseract.js` workers need `--single-thread` on some Windows setups: `pnpm test:run -- --pool=threads --poolOptions.threads.singleThread`. |
| Playwright complains about missing browsers | `pnpm exec playwright install --with-deps chromium`. |
| Tests pass locally, fail in CI | Most often missing env vars or a stale seeded DB. Re-run `db:setup` in the workflow before `test:e2e`. |
