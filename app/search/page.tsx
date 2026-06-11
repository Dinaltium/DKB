// app/search/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Server component — fetches all buses (with route stop IDs), stops, and
// operators from Neon in a single render pass, then hands the data off to
// the client-side SearchClient for filtering / display.
//
// force-dynamic prevents Next.js from trying to statically prerender this
// page at build time (which would fail because the DB may not be seeded yet).
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import {
	getAllBusesWithRouteIds,
	getAllOperators,
	getAllStops,
} from "@/lib/db/queries";
import { SearchClient } from "./SearchClient";

export default async function SearchPage() {
	const [buses, stops, operatorRows] = await Promise.all([
		getAllBusesWithRouteIds(),
		getAllStops(),
		getAllOperators(),
	]);

	// Flatten operator rows into a simple id → companyName map that can be
	// serialised as JSON props to the client component.
	const operators = operatorRows.map(({ operator }) => ({
		id: operator.id,
		companyName: operator.companyName,
	}));

	return (
		<AppShell
			title="Search Route"
			subtitle="Choose stops, compare fares, and open live bus pages"
		>
			<SearchClient buses={buses} stops={stops} operators={operators} />
		</AppShell>
	);
}
