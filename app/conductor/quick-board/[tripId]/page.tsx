"use client";

// Conductor's Quick Board pending column, scoped to one trip.
// Standalone page so it can be tested independently; the main /conductor
// page can later embed <QuickBoardPanel /> directly once the flow is signed off.

import { QuickBoardPanel } from "@/components/conductor/QuickBoardPanel";
import { AppShell } from "@/components/layout/AppShell";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface StopOption {
	id: number;
	stopName: string;
	stopOrder: number;
}

export default function ConductorQuickBoardPage() {
	const { tripId } = useParams<{ tripId: string }>();
	const tripIdNum = Number(tripId);
	const [stops, setStops] = useState<StopOption[]>([]);
	const [busLabel, setBusLabel] = useState<string>("");

	useEffect(() => {
		fetch("/api/quick-board/trips")
			.then((r) => r.json())
			.then((r) => {
				if (!r.success) return;
				const t = r.data.find((x: any) => x.tripId === tripIdNum);
				if (t) {
					setStops(t.stops);
					setBusLabel(`Bus ${t.busNumber} · ${t.origin} → ${t.destination}`);
				}
			});
	}, [tripIdNum]);

	return (
		<AppShell title="Quick Board" subtitle={busLabel}>
			{Number.isInteger(tripIdNum) && tripIdNum > 0 ? (
				<QuickBoardPanel tripId={tripIdNum} stops={stops} />
			) : (
				<p>Invalid trip id.</p>
			)}
		</AppShell>
	);
}
