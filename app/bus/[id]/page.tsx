"use client";

import { Suspense, use, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock4, QrCode, Users } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { AppShell } from "@/app/components/AppShell";
import { PaymentDrawer } from "@/app/components/PaymentDrawer";
import { ComplaintDialog } from "@/app/components/ComplaintDialog";
import {
  BUS_MAP,
  OPERATOR_MAP,
  calcFare,
  getStop,
  getStopsForRoute,
} from "@/lib/data";
import type { BusStatus, Stop } from "@/lib/types";
import { useLiveBus } from "@/app/context/LiveBusContext";

const BusMap = dynamic(() => import("@/app/components/BusMap"), { ssr: false });

const STATUS_BADGE: Record<BusStatus, string> = {
  Running: "text-emerald-700 bg-emerald-50 border-emerald-300",
  "Not Running": "text-rose-700 bg-rose-50 border-rose-300",
  Delayed: "text-amber-700 bg-amber-50 border-amber-300",
};

const VOTE_ITEMS = [
  { key: "onTime", label: "On Time" },
  { key: "slightlyLate", label: "Slightly Late" },
  { key: "veryLate", label: "Very Late" },
] as const;

type VoteKey = "onTime" | "slightlyLate" | "veryLate";
type Votes = Record<VoteKey, number>;

function BusDetailContent({ busId }: { busId: string }) {
  const searchParams = useSearchParams();
  const currentStopName =
    searchParams.get("currentStop") ?? "Mangalore Central";
  const { getPosition } = useLiveBus();

  const bus = BUS_MAP[busId];

  const [status, setStatus] = useState<BusStatus>(bus?.status ?? "Running");
  const [votes, setVotes] = useState<Votes>(
    bus?.votes ?? { onTime: 0, slightlyLate: 0, veryLate: 0 },
  );
  const [qrDataUrl, setQrDataUrl] = useState("");

  // Hydrate status and votes from localStorage
  useEffect(() => {
    try {
      const overrides = JSON.parse(
        localStorage.getItem("buslink_bus_status") ?? "{}",
      ) as Record<string, BusStatus>;
      if (overrides[busId]) setStatus(overrides[busId]);
    } catch {}

    try {
      const storedVotes = JSON.parse(
        localStorage.getItem("buslink_crowd_votes") ?? "{}",
      ) as Record<string, Votes>;
      if (storedVotes[busId]) setVotes(storedVotes[busId]);
    } catch {}
  }, [busId]);

  // Generate QR code
  useEffect(() => {
    const url = `${window.location.origin}/bus/${busId}`;
    import("qrcode").then(({ default: QRCode }) => {
      QRCode.toDataURL(url, { width: 170, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => {});
    });
  }, [busId]);

  const castVote = (key: VoteKey) => {
    const newVotes = { ...votes, [key]: votes[key] + 1 };
    setVotes(newVotes);
    try {
      const all = JSON.parse(
        localStorage.getItem("buslink_crowd_votes") ?? "{}",
      ) as Record<string, Votes>;
      all[busId] = newVotes;
      localStorage.setItem("buslink_crowd_votes", JSON.stringify(all));
    } catch {}
    toast.success("Thanks for your live update");
  };

  // Stable reference — prevents BusMap from tearing down + recreating on every live tick
  const routeStops = useMemo(
    () => (bus ? getStopsForRoute(bus.routeStopIds) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busId],
  );

  if (!bus) {
    return (
      <AppShell title="Bus not found" subtitle="Please check the QR link">
        <div
          data-testid="bus-detail-not-found-state"
          className="ticket-stub rounded-lg p-6 text-sm text-rose-600"
        >
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
      .map((stop, _, arr) => {
        const toIdx = bus.routeStopIds.indexOf(stop.id);
        const fare = calcFare(
          bus.fullFare,
          currentStopIdx,
          toIdx,
          bus.routeStopIds.length,
        );
        return { stop: stop.name, fare };
      });
  }, [bus, currentStopIdx, routeStops]);

  const availableSeats = bus.totalSeats - bus.occupiedSeats;

  return (
    <AppShell
      title={`Bus ${bus.number}`}
      subtitle="QR landing page for live route, fare and payments"
    >
      {/* ── Hero grid: info + schedule ── */}
      <section
        data-testid="bus-detail-hero-grid"
        className="grid gap-4 md:grid-cols-2"
      >
        {/* Info card */}
        <div className="ticket-stub rounded-lg border-2 border-slate-300 bg-white p-5">
          <p
            className="text-4xl font-extrabold uppercase text-[#0D1B2A]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            data-testid="bus-detail-main-info-title"
          >
            {bus.number}
          </p>
          <div className="mt-3 space-y-1.5 text-sm text-slate-700">
            <p data-testid="bus-detail-license-plate">
              License: {bus.licensePlate}
            </p>
            <p data-testid="bus-detail-driver-name">Driver: {bus.driverName}</p>
            <p data-testid="bus-detail-conductor-name">
              Conductor: {bus.conductorName}
            </p>
            <p data-testid="bus-detail-route">
              Route: {bus.origin} → {bus.destination}
            </p>
            <p data-testid="bus-detail-current-stop">
              Current stop context: {currentStop?.name ?? currentStopName}
            </p>
            <div
              data-testid="bus-detail-operational-status"
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_BADGE[status]}`}
            >
              {status}
            </div>
          </div>
        </div>

        {/* Schedule card */}
        <div className="rounded-lg border-2 border-slate-300 bg-white p-5">
          <p
            className="text-3xl font-extrabold uppercase text-[#0D1B2A]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            data-testid="bus-detail-schedule-title"
          >
            Schedule & Notice
          </p>
          <div className="mt-3 space-y-3 text-sm">
            <div
              data-testid="bus-detail-schedule-list"
              className="flex flex-wrap gap-2"
            >
              {bus.schedule.map((slot) => (
                <span
                  key={slot}
                  className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs"
                >
                  {slot}
                </span>
              ))}
            </div>
            <p
              data-testid="bus-detail-disclaimer"
              className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900"
            >
              {bus.statusNote}
            </p>
            <p
              data-testid="bus-detail-student-card"
              className="text-sm text-slate-700"
            >
              Student BusChalo Card:{" "}
              {bus.studentCardAccepted ? (
                <span className="font-semibold text-emerald-700">
                  Accepted &bull; {bus.studentDiscountPercent}% discount
                </span>
              ) : (
                <span className="text-slate-500">Not Accepted</span>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── Map ── */}
      <section data-testid="bus-detail-map-section" className="mt-6">
        <BusMap stops={routeStops} livePosition={getPosition(busId)} />
      </section>

      {/* ── Fare table + live status ── */}
      <section
        data-testid="bus-detail-fare-votes-grid"
        className="mt-6 grid gap-4 md:grid-cols-2"
      >
        {/* Fare table */}
        <div className="rounded-lg border-2 border-slate-300 bg-white p-5">
          <p
            className="text-3xl font-extrabold uppercase text-[#0D1B2A]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            data-testid="fare-table-title"
          >
            Fare from {currentStop?.name ?? currentStopName}
          </p>
          <div className="mt-3 space-y-2">
            {fareTable.length === 0 ? (
              <p className="text-sm text-slate-500">
                Stop not on this route. Showing full route fare: ₹{bus.fullFare}
              </p>
            ) : (
              fareTable.map((row) => (
                <div
                  key={row.stop}
                  data-testid={`fare-table-row-${row.stop.toLowerCase().replace(/\s+/g, "-")}`}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <span>{row.stop}</span>
                  <span className="font-semibold text-[#0E7C86]">
                    ₹{row.fare}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live crowd status */}
        <div className="rounded-lg border-2 border-slate-300 bg-white p-5">
          <p
            className="text-3xl font-extrabold uppercase text-[#0D1B2A]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            data-testid="crowd-vote-title"
          >
            Live Crowd Status
          </p>
          <div className="mt-3 space-y-3">
            {VOTE_ITEMS.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3"
              >
                <p
                  data-testid={`crowd-vote-count-${item.key}`}
                  className="text-sm text-slate-700"
                >
                  {item.label}: <strong>{votes[item.key]}</strong>
                </p>
                <button
                  onClick={() => castVote(item.key)}
                  data-testid={`crowd-vote-button-${item.key}`}
                  className="h-9 rounded-none border-2 border-[#0D1B2A] bg-white px-3 text-xs font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-slate-100"
                >
                  Vote
                </button>
              </div>
            ))}

            <div
              data-testid="women-reserved-seat-info"
              className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900"
            >
              Women Reserved Seats: {bus.womenReservedAvailable} /{" "}
              {bus.womenReservedTotal}
            </div>

            <div
              data-testid="available-seats-info"
              className="rounded-md border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700"
            >
              <Users className="mr-2 inline-block h-4 w-4" />
              Available Seats: {availableSeats} / {bus.totalSeats}
            </div>
          </div>
        </div>
      </section>

      {/* ── QR code + operator info ── */}
      <section
        data-testid="bus-detail-qr-section"
        className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]"
      >
        <div className="flex flex-col items-center rounded-lg border-2 border-slate-300 bg-white p-4">
          <QrCode className="mb-2 h-5 w-5 text-[#0D1B2A]" />
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code for bus ${bus.number}`}
              width={170}
              height={170}
              data-testid="bus-detail-qr-code"
            />
          ) : (
            <div className="flex h-[170px] w-[170px] items-center justify-center bg-slate-100 text-xs text-slate-400">
              Generating QR...
            </div>
          )}
        </div>

        <div className="rounded-lg border-2 border-slate-300 bg-white p-5">
          <div className="space-y-3 text-sm text-slate-700">
            <p data-testid="bus-detail-qr-info-text">
              Operators can print this QR and place it inside the bus for
              instant passenger access — no app download required.
            </p>
            <p data-testid="bus-detail-operator-info">
              Operator: {operator?.name ?? "Unknown"}
            </p>
            <p data-testid="bus-detail-full-fare">
              Full Route Fare: ₹{bus.fullFare}
            </p>
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
        className="fixed bottom-16 left-0 right-0 z-30 flex items-center justify-center gap-2 bg-white/90 px-4 py-3 backdrop-blur-md md:bottom-4 md:left-auto md:right-4 md:w-auto md:rounded-lg md:border md:border-slate-200"
      >
        <PaymentDrawer busNumber={bus.number} amount={bus.fullFare} />
        <ComplaintDialog busNumber={bus.number} />
      </div>
    </AppShell>
  );
}

export default function BusDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="buslink-page flex items-center justify-center p-12 text-slate-600">
          Loading bus details...
        </div>
      }
    >
      <BusDetailContent busId={id} />
    </Suspense>
  );
}
