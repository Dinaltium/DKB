"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { calcFare } from "@/lib/data";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { BusWithRouteIds } from "@/lib/db/queries";
import type { Stop } from "@/lib/db/schema";
import type { BusStatus } from "@/lib/types";

// ── Props ─────────────────────────────────────────────────────────────────────

interface OperatorSummary {
  id: string;
  companyName: string;
}

interface Props {
  buses: BusWithRouteIds[];
  stops: Stop[];
  operators: OperatorSummary[];
}

// ── Search result ─────────────────────────────────────────────────────────────

interface SearchResult {
  busId: string;
  busNumber: string;
  origin: string;
  destination: string;
  operatorName: string;
  departureTime: string;
  fare: number;
  availableSeats: number;
  status: BusStatus;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SearchClient({ buses, stops, operators }: Props) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [maxFare, setMaxFare] = useState("");
  const [minSeats, setMinSeats] = useState("");
  const [searched, setSearched] = useState(false);

  // ── Lookup maps (stable across re-renders) ──────────────────────────────────
  const stopsByName = useMemo<Record<string, Stop>>(
    () => Object.fromEntries(stops.map((s) => [s.name.toLowerCase(), s])),
    [stops],
  );

  const operatorMap = useMemo<Record<string, string>>(
    () => Object.fromEntries(operators.map((o) => [o.id, o.companyName])),
    [operators],
  );

  const stopNames = useMemo(() => stops.map((s) => s.name), [stops]);

  // ── Filter / search logic ───────────────────────────────────────────────────
  const results = useMemo<SearchResult[]>(() => {
    if (!searched || !origin.trim() || !destination.trim()) return [];

    const fromStop = stopsByName[origin.trim().toLowerCase()];
    const toStop = stopsByName[destination.trim().toLowerCase()];

    return buses.flatMap((bus) => {
      const fromIdx = fromStop ? bus.routeStopIds.indexOf(fromStop.id) : -1;
      const toIdx = toStop ? bus.routeStopIds.indexOf(toStop.id) : -1;

      if (fromIdx === -1 || toIdx === -1) return [];
      if (fromIdx >= toIdx) return [];

      const fare = calcFare(
        bus.fullFare,
        fromIdx,
        toIdx,
        bus.routeStopIds.length,
      );
      const availableSeats = bus.totalSeats - bus.occupiedSeats;
      const status = bus.status as BusStatus;
      const schedule = bus.schedule as string[];

      if (maxFare && fare > parseInt(maxFare, 10)) return [];
      if (minSeats && availableSeats < parseInt(minSeats, 10)) return [];
      if (timeFilter) {
        if (!schedule.some((t) => t >= timeFilter)) return [];
      }

      const departureTime = timeFilter
        ? (schedule.find((t) => t >= timeFilter) ?? schedule[0] ?? "--:--")
        : (schedule[0] ?? "--:--");

      return [
        {
          busId: bus.id,
          busNumber: bus.number,
          origin: fromStop.name,
          destination: toStop.name,
          operatorName:
            (bus.operatorId && operatorMap[bus.operatorId]) ??
            "Unassigned operator",
          departureTime,
          fare,
          availableSeats,
          status,
        } satisfies SearchResult,
      ];
    });
  }, [
    searched,
    origin,
    destination,
    timeFilter,
    maxFare,
    minSeats,
    buses,
    stopsByName,
    operatorMap,
  ]);

  // ── Styles (shared) ─────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    background: "var(--input-bg)",
    borderColor: "var(--input-border)",
    color: "var(--input-text)",
  };

  // ── No-stops guard ──────────────────────────────────────────────────────────
  if (stops.length === 0) {
    return (
      <EmptyState
        title="No stops configured"
        description="An admin needs to add stops to the platform before route search is available."
      />
    );
  }

  // ── No-buses guard ──────────────────────────────────────────────────────────
  if (buses.length === 0) {
    return (
      <EmptyState
        title="No buses available"
        description="No buses have been added to the platform yet. Operators can register buses from their dashboard."
        action={
          <Link
            href="/auth"
            className="inline-flex h-10 items-center rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-5 text-xs font-bold uppercase tracking-wide text-[#0D1B2A] shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:opacity-80"
          >
            Operator Login
          </Link>
        }
      />
    );
  }

  return (
    <>
      {/* ── Search form ── */}
      <section
        className="rounded-none border-2 p-4 shadow-[4px_4px_0_hsl(var(--foreground))] md:p-6"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border-default)",
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {/* Origin */}
          <div className="flex flex-col gap-1">
            <label
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Origin stop
            </label>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              list="stop-options"
              placeholder="e.g. Mangalore Central"
              data-testid="route-origin-input"
              className="h-12 w-full rounded-none border-2 border-foreground bg-background px-3 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
              style={inputStyle}
            />
          </div>

          {/* Destination */}
          <div className="flex flex-col gap-1">
            <label
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Destination stop
            </label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              list="stop-options"
              placeholder="e.g. Udupi"
              data-testid="route-destination-input"
              className="h-12 w-full rounded-none border-2 border-foreground bg-background px-3 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
              style={inputStyle}
            />
          </div>

          {/* Filters row */}
          <div className="flex flex-col gap-1">
            <label
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Depart after
            </label>
            <input
              type="time"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              data-testid="route-time-filter-input"
              className="h-12 rounded-none border-2 border-foreground bg-background px-3 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                Max fare (&#8377;)
              </label>
              <input
                type="number"
                min="0"
                value={maxFare}
                onChange={(e) => setMaxFare(e.target.value)}
                placeholder="Any"
                data-testid="route-max-fare-filter-input"
                className="h-12 rounded-none border-2 border-foreground bg-background px-3 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
                style={inputStyle}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                Min seats
              </label>
              <input
                type="number"
                min="0"
                value={minSeats}
                onChange={(e) => setMinSeats(e.target.value)}
                placeholder="Any"
                data-testid="route-min-seats-filter-input"
                className="h-12 rounded-none border-2 border-foreground bg-background px-3 text-sm outline-none shadow-[4px_4px_0_hsl(var(--foreground))] focus-visible:translate-x-[4px] focus-visible:translate-y-[4px] focus-visible:shadow-none"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Autocomplete list populated from DB stops */}
        <datalist id="stop-options">
          {stopNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <button
          onClick={() => {
            if (origin.trim() && destination.trim()) setSearched(true);
          }}
          data-testid="route-search-submit-button"
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-6 text-sm font-bold uppercase tracking-wider text-[#0D1B2A] shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none hover:opacity-80"
        >
          <Search className="h-4 w-4" />
          Search Buses
        </button>
      </section>

      {/* ── Results ── */}
      <section
        className="mt-8 space-y-4"
        data-testid="route-search-results-section"
      >
        {/* Prompt to search */}
        {!searched && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Enter an origin and destination above, then press Search.
          </p>
        )}

        {/* No results */}
        {searched && results.length === 0 && (
          <EmptyState
            title="No buses found"
            description="No buses match this route and filter combination. Try adjusting the filters or choosing different stops."
          />
        )}

        {/* Result cards */}
        {results.map((item) => (
          <div
            key={item.busId}
            data-testid={`search-result-card-${item.busNumber.toLowerCase()}`}
            className="rounded-none border-2 shadow-[4px_4px_0_hsl(var(--foreground))]"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-default)",
            }}
          >
            <div className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
              {/* Bus identity */}
              <div>
                <p
                  className="text-4xl font-extrabold leading-none"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    color: "var(--text-primary)",
                  }}
                  data-testid={`search-result-bus-number-${item.busNumber.toLowerCase()}`}
                >
                  {item.busNumber}
                </p>
                <p
                  className="mt-1 text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.origin} &#8594; {item.destination}
                </p>
                <p
                  className="mt-0.5 text-xs uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.operatorName}
                </p>
              </div>

              {/* Trip details */}
              <div
                className="space-y-1.5 text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: "var(--text-muted)" }}>Departure</span>
                  <strong>{item.departureTime}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: "var(--text-muted)" }}>Fare</span>
                  <strong className="text-[#0E7C86]">&#8377;{item.fare}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: "var(--text-muted)" }}>Seats</span>
                  <strong>{item.availableSeats}</strong>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: "var(--text-muted)" }}>Status</span>
                  <StatusBadge status={item.status} />
                </div>
              </div>

              {/* CTA */}
              <Link
                href={`/bus/${item.busId}?currentStop=${encodeURIComponent(origin)}`}
                data-testid={`search-result-open-bus-${item.busNumber.toLowerCase()}`}
                className="inline-flex h-10 items-center justify-center rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] px-5 text-xs font-bold uppercase tracking-wider text-white shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:opacity-80"
              >
                View Bus
              </Link>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
