import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/app/components/AppShell";
import { getBusById, getStopsForBus, getRouteStopIds } from "@/lib/db/queries";
import { calcFare } from "@/lib/db/fare";
import { BusDetailClient } from "./BusDetailClient";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ currentStop?: string }>;
}

export default async function BusDetailPage({ params, searchParams }: Props) {
  const { id }          = await params;
  const { currentStop } = await searchParams;
  const session         = await auth();

  // Load bus + route stops from Neon
  const [bus, stops, stopIds] = await Promise.all([
    getBusById(id),
    getStopsForBus(id),
    getRouteStopIds(id),
  ]);

  if (!bus) notFound();

  // Build fare table from current stop
  const currentStopName = currentStop ?? stops[0]?.name ?? "";
  const currentStopObj  = stops.find((s) => s.name === currentStopName || s.id === currentStopName) ?? stops[0];
  const currentIdx      = stopIds.indexOf(currentStopObj?.id ?? "");

  const fareTable = stops
    .filter((_, i) => i !== currentIdx)
    .map((stop) => {
      const toIdx = stopIds.indexOf(stop.id);
      return {
        stop: stop.name,
        fare: calcFare(bus.fullFare, currentIdx, toIdx, stopIds.length),
      };
    });

  return (
    <AppShell
      title={`Bus ${bus.number}`}
      subtitle="Live route, fares and payments"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center p-12" style={{ color: "var(--text-muted)" }}>
          Loading bus details...
        </div>
      }>
        <BusDetailClient
          bus={bus}
          stops={stops}
          fareTable={fareTable}
          currentStopName={currentStopObj?.name ?? currentStopName}
          session={session ? { id: session.user.id, role: session.user.role } : null}
        />
      </Suspense>
    </AppShell>
  );
}