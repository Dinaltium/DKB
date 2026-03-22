# BusLink (dkbus)

**BusLink** is a Next.js app for a Mangalore–Udupi smart bus platform: route search, fares, live-style bus info, QR flows, and role-based dashboards (passenger, operator, admin). The UI leans **neobrutalist / BoldKit** (high-contrast borders, uppercase accents, Barlow Condensed for display type).

---

## Tech stack

| Area | Choice |
|------|--------|
| **Framework** | [Next.js 15](https://nextjs.org) (App Router), React 19 |
| **Language** | TypeScript (strict) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com), `tw-animate-css`, CSS variables in `app/globals.css` |
| **UI primitives** | [shadcn/ui](https://ui.shadcn.com) style **base-nova**, plus **BoldKit** registry (`components.json` → `@boldkit`) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Maps** | [Leaflet](https://leafletjs.com) + [react-leaflet](https://react-leaflet.js.org) |
| **Auth** | [Auth.js / next-auth v5 beta](https://authjs.dev) with Drizzle adapter |
| **Database** | [PostgreSQL](https://www.postgresql.org) via [Neon](https://neon.tech) (`@neondatabase/serverless`) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team) + [drizzle-kit](https://orm.drizzle.team/kit-docs/overview) (migrations under `drizzle/`) |
| **PWA** | [`@ducanh2912/next-pwa`](https://github.com/DuCanhGH/next-pwa) (disabled in development) |
| **Toasts** | [Sonner](https://sonner.emilkowal.ski/) |
| **Package manager** | [pnpm](https://pnpm.io) (`pnpm-lock.yaml`) |

Some Radix primitives (`dialog`, `tabs`, `scroll-area`, `toggle-group`, etc.) sit alongside **@base-ui/react** toggles where the design system expects them.

---

## Project structure

Complete layout of **folders and files** in the repo (as tracked or present in the working tree). **Not listed** (generated or install-only): `node_modules/`, `.next/`, `.nextwin/`, `.git/`, `coverage/`, `out/`, `build/`, and local env files matching `.env*` (create `.env.local` from `.env.local.example` when present). After a production build, **next-pwa** may add `public/sw.js` and related workbox assets.

```text
dkbus/
├── .env.local.example
├── .gitignore
├── README.md
├── app.py
├── auth.ts
├── components.json
├── drizzle.config.ts
├── eslint.config.mjs
├── fix_csv.py
├── geocode_log.csv
├── locations_failed.json
├── locations_with_coords.json
├── middleware.ts
├── next-env.d.ts
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── seed-stops.sql
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── page.tsx
│   ├── error.tsx
│   ├── forbidden.tsx
│   ├── not-found.tsx
│   ├── admin/
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── me/
│   │   │   └── route.ts
│   │   ├── pending-count/
│   │   │   └── route.ts
│   │   ├── sim-data/
│   │   │   └── route.ts
│   │   └── stats/
│   │       └── route.ts
│   ├── auth/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── bus/
│   │   └── [id]/
│   │       ├── BusDetailClient.tsx
│   │       ├── loading.tsx
│   │       └── page.tsx
│   ├── change-password/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── context/
│   │   ├── AuthProvider.tsx
│   │   ├── LanguageContext.tsx
│   │   ├── LiveBusContext.tsx
│   │   └── ThemeContext.tsx
│   ├── dashboard/
│   │   ├── AdminDashboard.tsx
│   │   ├── OperatorDashboard.tsx
│   │   ├── PassengerDashboard.tsx
│   │   ├── loading.tsx
│   │   └── page.tsx
│   ├── operator/
│   │   └── page.tsx
│   └── search/
│       ├── SearchClient.tsx
│       ├── loading.tsx
│       └── page.tsx
├── drizzle/
│   └── seed.sql
├── hooks/
│   └── use-theme.ts
├── lib/
│   ├── data.ts
│   ├── types.ts
│   ├── utils.ts
│   ├── actions/
│   │   ├── auth.ts
│   │   └── bus.ts
│   ├── db/
│   │   ├── fare.ts
│   │   ├── index.ts
│   │   ├── queries.ts
│   │   └── schema.ts
│   └── i18n/
│       ├── be.ts
│       ├── en.ts
│       ├── index.ts
│       ├── kn.ts
│       └── tcy.ts
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── manifest.json
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── scripts/
│   ├── ensure-next-dir.mjs
│   ├── seed.ts
│   └── seed-stops.ts
├── src/
│   └── components/
│       ├── layout/
│       │   ├── AppShell.tsx
│       │   ├── PageProgress.tsx
│       │   └── Providers.tsx
│       ├── maps/
│       │   ├── BusMap.tsx
│       │   └── FleetMap.tsx
│       ├── modals/
│       │   ├── AddBusModal.tsx
│       │   ├── BusDetailModal.tsx
│       │   ├── BusRequestModal.tsx
│       │   ├── ComplaintDialog.tsx
│       │   ├── CreateOperatorModal.tsx
│       │   ├── ImportStopsModal.tsx
│       │   ├── ModalFrame.tsx
│       │   ├── OperatorModal.tsx
│       │   └── PaymentDrawer.tsx
│       ├── shared/
│       │   ├── EmptyState.tsx
│       │   ├── RouteTracer.tsx
│       │   ├── StatusBadge.tsx
│       │   └── StopBuilder.tsx
│       └── ui/
│           ├── badge.tsx
│           ├── button.tsx
│           ├── card.tsx
│           ├── dialog.tsx
│           ├── input.tsx
│           ├── label.tsx
│           ├── progress.tsx
│           ├── scroll-area.tsx
│           ├── separator.tsx
│           ├── skeleton.tsx
│           ├── sonner.tsx
│           ├── tabs.tsx
│           ├── toggle-group.tsx
│           └── toggle.tsx
├── styles/
│   └── globals.css
└── types/
    └── next-auth.d.ts
```

**Roles of major areas:** **`app/`** — App Router routes, API route handlers, page-level UI, and React context providers. **`src/components/`** — shared UI (see “Import paths” below); no root-level `components/` package. **`lib/`** — database, server actions, i18n, utilities. **`drizzle/`** — SQL artifacts; running `pnpm db:generate` adds migration files here. **`scripts/`** — Node/TS tooling and seeds.

---

## Conventions in use (current)

1. **Import paths**  
   - `@/lib/...` → project root `lib/`.  
   - `@/components/...` → **`src/components/...`** (see `tsconfig.json` `paths`).  
   - **Webpack** in `next.config.ts` also sets `resolve.alias["@/components"]` → `src/components` so bundling does not accidentally resolve to a removed root `components/` directory.

2. **UI system**  
   - Add or update primitives with **shadcn CLI** using `components.json` (style **base-nova**, BoldKit registry).  
   - Prefer existing **`src/components/ui/*`** patterns (`cn`, CVA, data-slot attributes) for new pieces.

3. **Data & mutations**  
   - Schema: `lib/db/schema.ts`.  
   - Server mutations and server-side orchestration: `lib/actions/*`.  
   - Prefer server actions or route handlers over ad hoc client-side DB access.

4. **Modals & scroll**  
   - Large modals (e.g. operator) use a **fixed header + fixed tab bar + `ScrollArea` body** (`flex flex-col`, `max-h-[90vh]`, `min-h-0`, `overflow-hidden` on the dialog shell) so tall content scrolls inside the modal, not off-screen.

5. **i18n**  
   - Copy lives under `lib/i18n/`; wire through existing context/patterns when adding strings.

6. **Environment**  
   - Local secrets and DB URL: **`.env.local`** (not committed).  
   - Drizzle CLI scripts use `dotenv -e .env.local`.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server (`predev` ensures Next output dir) |
| `pnpm build` / `pnpm start` | Production build / run |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Generate Drizzle migrations from schema |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema (uses `--force` in script; use with care) |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm db:seed-ts` | TypeScript seed (`scripts/seed.ts` + `.env.local`) |
| `pnpm db:setup` | `db:push` then `db:seed-ts` |

---

## Getting started

1. Install dependencies: `pnpm install`
2. Copy env: create **`.env.local`** with at least `DATABASE_URL` and any Auth.js variables your app expects.
3. Apply DB schema / seed as needed: e.g. `pnpm db:setup`
4. Run: `pnpm dev` → open [http://localhost:3000](http://localhost:3000)

---

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Drizzle documentation](https://orm.drizzle.team/docs/overview)
- [Auth.js documentation](https://authjs.dev)
