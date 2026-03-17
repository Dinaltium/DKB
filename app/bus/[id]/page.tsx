"use client";

import { Suspense, use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock4, QrCode, Users } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { AppShell } from "@/app/components/AppShell";
import { PaymentDrawer } from "@/app/components/PaymentDrawer";
import { ComplaintDialog } from "@/app/components/ComplaintDialog";
import { BUS_MAP, OPERATOR_MAP, calcFare, getStop, getStopsForRoute } from "@/lib/data";
import type { BusStatus, Stop } from "@/lib/types";
import { useLiveBus } from "@/app/context/LiveBusContext";

const BusMap = dynamic(() => import("@/app/components/BusMap"), { ssr: false });

const VOTE_ITEMS = [
  { key: "onTime", label: "On Time" },
  { key: "slightlyLate", label: "Slightly Late" },
  { key: "veryLate", label: "Very Late" },
] as const;

type VoteKey = "onTime" | "slightlyLate" | "veryLate";
type Votes = Record<VoteKey, number>;

function BusDetailContent({ busId }: { busId: string }) {
  const searchParams = useSearchParams();
  const currentStopName = searchParams.get("currentStop") ?? "Mangalore Central";
  const { getPosition } = useLiveBus();

  const bus = BUS_MAP[busId];

  const [status, setStatus] = useState<BusStatus>(bus?.status ?? "Running");
  const [votes, setVotes] = useState<Votes>(bus?.votes ?? { onTime: 0, slightlyLate: 0, veryLate: 0 });
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    try {
      const overrides = JSON.parse(localStorage.getItem("buslink_bus_status") ?? "{}") as Record<string, BusStatus>;
      if (overrides[busId]) setStatus(overrides[busId]);
    } catch {}
    try {
      const storedVotes = JSON.parse(localStorage.getItem("buslink_crowd_votes") ?? "{}") as Record<string, Votes>;
      if (storedVotes[busId]) setVotes(storedVotes[busId]);
    } catch {}
  }, [busId]);

  useEffect(() => {
    const url = `${window.location.origin}/bus/${busId}`;
    import("qrcode").then(({ default: QRCode }) => {
      QRCode.toDataURL(url, { width: 170, margin: 1 }).then(setQrDataUrl).catch(() => {});
    });
  }, [busId]);

  const castVote = (key: VoteKey) => {
    const newVotes = { ...votes, [key]: votes[key] + 1 };
    setVotes(newVotes);
    try {
      const all = JSON.parse(localStorage.getItem("buslink_crowd_votes") ?? "{}") as Record<string, Votes>;
      all[busId] = newVotes;
      localStorage.setItem("buslink_crowd_votes", JSON.stringify(all));
    } catch {}
    toast.success("Thanks for your live update");
  };

  const routeStops = useMemo(() => (bus ? getStopsForRoute(bus.routeStopIds) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busId]);

  if (!bus) {
    return (
      <AppShell title="Bus not found" subtitle="Please check the QR link">
        <div data-testid="bus-detail-not-found-state" className="ticket-stub rounded-lg p-6 text-sm" style={{ color: "#ef4444" }}>
          The bus you requested is not available.
        </div>
      </AppShell>
    );
  }

  const operator = OPERATOR_MAP[bus.operatorId];
  const currentStop = getStop(currentStopName) ?? routeStops[0];
  const currentStopIdx = bus.routeStopIds.indexOf(currentStop?.id ?? "");

  const fareTable = useMemo(() => {
    if (currentStopIdx === -1) return [];
    return routeStops
      .filter((_, idx) => idx !== currentStopIdx)
      .map((stop) => {
        const toIdx = bus.routeStopIds.indexOf(stop.id);
        const fare = calcFare(bus.fullFare, currentStopIdx, toIdx, bus.routeStopIds.length);
        return { stop: stop.name, fare };
      });
  }, [bus, currentStopIdx, routeStops]);

  const availableSeats = bus.totalSeats - bus.occupiedSeats;

  const statusStyle = (s: BusStatus) => {
    if (s === "Running") return { background: "var(--status-running-bg)", color: "var(--status-running-text)", border: "1px solid var(--status-running-border)" };
    if (s === "Delayed") return { background: "var(--status-delayed-bg)", color: "var(--status-delayed-text)", border: "1px solid var(--status-delayed-border)" };
    return { background: "var(--status-stopped-bg)", color: "var(--status-stopped-text)", border: "1px solid var(--status-stopped-border)" };
  };

  const cardStyle = { background: "var(--bg-surface)", borderColor: "var(--border-default)" };

  return (
    <AppShell title={`Bus ${bus.number}`} subtitle="QR landing page for live route, fare and payments">

      {/* ── Hero grid ── */}
      <section data-testid="bus-detail-hero-grid" className="grid gap-4 md:grid-cols-2">
        {/* Info card */}
        <div className="ticket-stub rounded-lg border-2 p-5" style={cardStyle}>
          <p className="text-4xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
            data-testid="bus-detail-main-info-title">
            {bus.number}
          </p>
          <div className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p data-testid="bus-detail-license-plate">License: {bus.licensePlate}</p>
            <p data-testid="bus-detail-driver-name">Driver: {bus.driverName}</p>
            <p data-testid="bus-detail-conductor-name">Conductor: {bus.conductorName}</p>
            <p data-testid="bus-detail-route">Route: {bus.origin} → {bus.destination}</p>
            <p data-testid="bus-detail-current-stop">Current stop context: {currentStop?.name ?? currentStopName}</p>
            <div data-testid="bus-detail-operational-status" className="mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold"
              style={statusStyle(status)}>
              {status}
            </div>
          </div>
        </div>

        {/* Schedule card */}
        <div className="rounded-lg border-2 p-5" style={cardStyle}>
          <p className="text-3xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
            data-testid="bus-detail-schedule-title">
            Schedule & Notice
          </p>
          <div className="mt-3 space-y-3 text-sm">
            <div data-testid="bus-detail-schedule-list" className="flex flex-wrap gap-2">
              {bus.schedule.map((slot) => (
                <span key={slot} className="rounded-md border px-2 py-1 text-xs"
                  style={{ background: "var(--bg-surface-2)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
                  {slot}
                </span>
              ))}
            </div>
            <p data-testid="bus-detail-disclaimer" className="rounded-md border p-2 text-xs"
              style={{ background: "var(--status-delayed-bg)", borderColor: "var(--status-delayed-border)", color: "var(--status-delayed-text)" }}>
              {bus.statusNote}
            </p>
            <p data-testid="bus-detail-student-card" className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Student BusChalo Card:{" "}
              {bus.studentCardAccepted
                ? <span className="font-semibold text-emerald-500">&bull; Accepted &bull; {bus.studentDiscountPercent}% discount</span>
                : <span style={{ color: "var(--text-muted)" }}>Not Accepted</span>}
            </p>
          </div>
        </div>
      </section>

      {/* ── Map ── */}
      <section data-testid="bus-detail-map-section" className="mt-6">
        <BusMap stops={routeStops} livePosition={getPosition(busId)} />
      </section>

      {/* ── Fare table + live status ── */}
      <section data-testid="bus-detail-fare-votes-grid" className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Fare table */}
        <div className="rounded-lg border-2 p-5" style={cardStyle}>
          <p className="text-3xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
            data-testid="fare-table-title">
            Fare from {currentStop?.name ?? currentStopName}
          </p>
          <div className="mt-3 space-y-2">
            {fareTable.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Stop not on this route. Showing full route fare: ₹{bus.fullFare}
              </p>
            ) : (
              fareTable.map((row) => (
                <div key={row.stop}
                  data-testid={`fare-table-row-${row.stop.toLowerCase().replace(/\s+/g, "-")}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
                  <span>{row.stop}</span>
                  <span className="font-semibold text-[#0E7C86]">₹{row.fare}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live crowd status */}
        <div className="rounded-lg border-2 p-5" style={cardStyle}>
          <p className="text-3xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
            data-testid="crowd-vote-title">
            Live Crowd Status
          </p>
          <div className="mt-3 space-y-3">
            {VOTE_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <p data-testid={`crowd-vote-count-${item.key}`} className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {item.label}: <strong style={{ color: "var(--text-primary)" }}>{votes[item.key]}</strong>
                </p>
                <button onClick={() => castVote(item.key)} data-testid={`crowd-vote-button-${item.key}`}
                  className="h-9 rounded-none border-2 px-3 text-xs font-bold uppercase tracking-wide hover:opacity-80"
                  style={{ background: "var(--bg-surface-2)", borderColor: "var(--border-strong)", color: "var(--text-primary)" }}>
                  Vote
                </button>
              </div>
            ))}

            <div data-testid="women-reserved-seat-info" className="rounded-md border p-3 text-sm"
              style={{ background: "var(--bg-surface-2)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
              Women Reserved Seats: {bus.womenReservedAvailable} / {bus.womenReservedTotal}
            </div>

            <div data-testid="available-seats-info" className="rounded-md border p-3 text-sm"
              style={{ background: "var(--bg-surface-2)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
              <Users className="mr-2 inline-block h-4 w-4" />
              Available Seats: {availableSeats} / {bus.totalSeats}
            </div>
          </div>
        </div>
      </section>

      {/* ── QR code + operator info ── */}
      <section data-testid="bus-detail-qr-section" className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center rounded-lg border-2 p-4" style={cardStyle}>
          <QrCode className="mb-2 h-5 w-5" style={{ color: "var(--text-primary)" }} />
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR code for bus ${bus.number}`} width={170} height={170} data-testid="bus-detail-qr-code"
              style={{ borderRadius: 4 }} />
          ) : (
            <div className="flex h-[170px] w-[170px] items-center justify-center text-xs rounded"
              style={{ background: "var(--bg-surface-2)", color: "var(--text-muted)" }}>
              Generating QR...
            </div>
          )}
        </div>

        <div className="rounded-lg border-2 p-5" style={cardStyle}>
          <div className="space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p data-testid="bus-detail-qr-info-text">
              Operators can print this QR and place it inside the bus for instant passenger access — no app download required.
            </p>
            <p data-testid="bus-detail-operator-info">Operator: {operator?.name ?? "Unknown"}</p>
            <p data-testid="bus-detail-full-fare">Full Route Fare: ₹{bus.fullFare}</p>
            <p data-testid="bus-detail-last-updated">
              <Clock4 className="mr-2 inline h-4 w-4" />
              Status refreshes when you vote or reload.
            </p>
          </div>
        </div>
      </section>

      {/* ── Sticky bottom action bar ── */}
      <div
        data-testid="bus-detail-sticky-action-bar"
        className="fixed bottom-16 left-0 right-0 z-30 flex items-center justify-center gap-2 px-4 py-3 backdrop-blur-md md:bottom-4 md:left-auto md:right-4 md:w-auto md:rounded-lg md:border"
        style={{ background: "var(--header-bg)", borderColor: "var(--border-default)" }}
      >
        <PaymentDrawer busNumber={bus.number} amount={bus.fullFare} />
        <ComplaintDialog busNumber={bus.number} />
      </div>
    </AppShell>
  );
}

export default function BusDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="buslink-page flex items-center justify-center p-12" style={{ color: "var(--text-muted)" }}>Loading bus details...</div>}>
      <BusDetailContent busId={id} />
    </Suspense>
  );
}