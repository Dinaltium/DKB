"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import { BUSES, OPERATORS, STOPS, calcFare, getStop } from "@/lib/data";
import type { BusStatus } from "@/lib/types";

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

const STOP_NAMES = STOPS.map((s) => s.name);

function getEffectiveStatus(busId: string, defaultStatus: BusStatus): BusStatus {
  try {
    const overrides = JSON.parse(
      localStorage.getItem("buslink_bus_status") ?? "{}",
    ) as Record<string, BusStatus>;
    return overrides[busId] ?? defaultStatus;
  } catch {
    return defaultStatus;
  }
}

export default function SearchPage() {
  const [origin, setOrigin] = useState("Mangalore Central");
  const [destination, setDestination] = useState("Udupi");
  const [timeFilter, setTimeFilter] = useState("");
  const [maxFare, setMaxFare] = useState("");
  const [minSeats, setMinSeats] = useState("");
  const [searched, setSearched] = useState(false);

  const OPERATORS_MAP = useMemo(
    () => Object.fromEntries(OPERATORS.map((o) => [o.id, o])),
    [],
  );

  const results = useMemo<SearchResult[]>(() => {
    if (!searched) return [];
    if (!origin || !destination) return [];

    const fromStop = getStop(origin);
    const toStop = getStop(destination);

    return BUSES.flatMap((bus) => {
      const fromIdx = fromStop ? bus.routeStopIds.indexOf(fromStop.id) : -1;
      const toIdx = toStop ? bus.routeStopIds.indexOf(toStop.id) : -1;

      if (fromIdx === -1 || toIdx === -1) return [];
      if (fromIdx >= toIdx) return [];

      const fare = calcFare(bus.fullFare, fromIdx, toIdx, bus.routeStopIds.length);
      const availableSeats = bus.totalSeats - bus.occupiedSeats;
      const status = getEffectiveStatus(bus.id, bus.status);

      if (maxFare && fare > parseInt(maxFare)) return [];
      if (minSeats && availableSeats < parseInt(minSeats)) return [];
      if (timeFilter) {
        const firstMatch = bus.schedule.find((t) => t >= timeFilter);
        if (!firstMatch) return [];
      }

      const departureTime = timeFilter
        ? (bus.schedule.find((t) => t >= timeFilter) ?? bus.schedule[0])
        : bus.schedule[0];

      const operator = OPERATORS_MAP[bus.operatorId];

      return [
        {
          busId: bus.id,
          busNumber: bus.number,
          origin: fromStop!.name,
          destination: toStop!.name,
          operatorName: operator?.name ?? "Unknown Operator",
          departureTime,
          fare,
          availableSeats,
          status,
        } satisfies SearchResult,
      ];
    });
  }, [searched, origin, destination, timeFilter, maxFare, minSeats, OPERATORS_MAP]);

  const handleSearch = () => {
    if (!origin || !destination) return;
    setSearched(true);
  };

  const statusStyle = (s: BusStatus) => {
    if (s === "Running")
      return {
        background: "var(--status-running-bg)",
        color: "var(--status-running-text)",
        border: "1px solid var(--status-running-border)",
      };
    if (s === "Delayed")
      return {
        background: "var(--status-delayed-bg)",
        color: "var(--status-delayed-text)",
        border: "1px solid var(--status-delayed-border)",
      };
    return {
      background: "var(--status-stopped-bg)",
      color: "var(--status-stopped-text)",
      border: "1px solid var(--status-stopped-border)",
    };
  };

  const inputStyle = {
    background: "var(--input-bg)",
    borderColor: "var(--input-border)",
    color: "var(--input-text)",
  };

  return (
    <AppShell
      title="Search Route"
      subtitle="Choose stops, compare fares, and open live bus pages"
    >
      {/* ── Search form ── */}
      <section className="ticket-stub rounded-lg p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            list="stop-options"
            placeholder="Origin stop"
            data-testid="route-origin-input"
            className="h-12 w-full border-2 px-3 text-sm outline-none"
            style={inputStyle}
          />
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            list="stop-options"
            placeholder="Destination stop"
            data-testid="route-destination-input"
            className="h-12 w-full border-2 px-3 text-sm outline-none"
            style={inputStyle}
          />
          <input
            type="time"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            data-testid="route-time-filter-input"
            className="h-12 border-2 px-3 text-sm outline-none"
            style={inputStyle}
          />
          <input
            type="number"
            value={maxFare}
            onChange={(e) => setMaxFare(e.target.value)}
            placeholder="Max fare ₹"
            data-testid="route-max-fare-filter-input"
            className="h-12 border-2 px-3 text-sm outline-none"
            style={inputStyle}
          />
          <input
            type="number"
            value={minSeats}
            onChange={(e) => setMinSeats(e.target.value)}
            placeholder="Min available seats"
            data-testid="route-min-seats-filter-input"
            className="h-12 border-2 px-3 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <datalist id="stop-options">
          {STOP_NAMES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <button
          onClick={handleSearch}
          data-testid="route-search-submit-button"
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-6 text-sm font-bold uppercase tracking-wider text-[#0D1B2A] hover:bg-amber-400"
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
        {searched && results.length === 0 && (
          <div className="ticket-stub rounded-lg p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
            No buses found for this route with the selected filters.
          </div>
        )}

        {results.map((item) => (
          <div
            key={item.busNumber}
            data-testid={`search-result-card-${item.busNumber.toLowerCase()}`}
            className="surface-card rounded-lg border-2"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border-default)",
            }}
          >
            <div className="grid gap-3 p-5 md:grid-cols-[1.3fr_1fr_auto] md:items-center">
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
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {item.origin} → {item.destination}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {item.operatorName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-1" style={{ color: "var(--text-primary)" }}>
                <p>
                  Departure: <strong>{item.departureTime}</strong>
                </p>
                <p className="font-semibold text-[#0E7C86]">Fare: ₹{item.fare}</p>
                <p>Seats: {item.availableSeats}</p>
                <span
                  className="inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={statusStyle(item.status)}
                >
                  {item.status}
                </span>
              </div>

              <Link
                href={`/bus/${item.busNumber}?currentStop=${encodeURIComponent(origin)}`}
                data-testid={`search-result-open-bus-${item.busNumber.toLowerCase()}`}
                className="inline-flex h-10 items-center rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800"
              >
                View Bus
              </Link>
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}