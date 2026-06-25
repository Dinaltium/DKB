# Mangaluru bus dataset

Extracted from [mangaluru-bus.in](https://mangaluru-bus.in/) (Laravel + Inertia app —
data pulled from its `routes-search/{route}` and `location/{slug}` Inertia JSON props,
not HTML scraping). Pulled 2026-06-20.

**Use for demo/reference only.** Third-party data — verify before production use.

## Files

### `buses.json` — 100 buses, each with its ordered stop sequence

```jsonc
{
  "uuid": "c203fbff-...",       // source route id
  "busNumber": "1",
  "direction": "both",          // both | up | down (as reported by source)
  "hasLocal": true,
  "hasGovt": false,
  "hasExpress": false,
  "stops": [
    { "order": 1, "slug": "car-street", "name": "Car Street", "lat": 12.87, "lng": 74.83 }
  ]
}
```

- `stops` is ordered by the source `order` field.
- `lat`/`lng` may be `null` — see coverage note below.

### `stops.json` — 184 unique stops

```jsonc
{
  "slug": "car-street",
  "name": "Car Street",
  "address": "",                // often blank at source
  "lat": 12.8702004,
  "lng": 74.8366794,
  "coordSrc": "seed"            // "site" = from mangaluru-bus.in, "seed" = from scripts/seed-stops.ts, absent = no coords
}
```

## Coordinate coverage

- 1099 total stop-visits across 100 buses.
- **86 / 184** stops have coordinates: 6 from the source site, 80 matched by slug to the
  existing geocoded set in `scripts/seed-stops.ts`.
- **98** stops have no coordinates yet — the source site does not carry them. Geocode
  later via Nominatim/OpenStreetMap (same path used for `seed-stops.ts`).

## Caveats to validate

- `routes-search` on the source does a **substring** match (`53` returns both 53 and 53A);
  this dataset is deduped by route `uuid`, so each bus appears once.
- Stop names/slugs come from the source and may differ from this project's existing
  `stops` table (e.g. `kaana` vs `kana`, `kaatipalla` vs `katipalla`). Reconcile before
  seeding into the app DB.
- Not yet wired to any API or page — raw data only, pending validation.
