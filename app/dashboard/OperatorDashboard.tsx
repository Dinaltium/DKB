"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bus, MessageSquare, Plus, TrendingUp, X } from "lucide-react";
import { updateBusStatusAction, resolveComplaintAction, submitBusRequestAction } from "@/lib/actions/bus";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import type { Bus as BusType, Complaint, Operator, Payment, BusRequest } from "@/lib/db/schema";
import type { Stop } from "@/lib/db/schema";

interface Props {
  operator: Operator;
  buses: BusType[];
  complaints: Complaint[];
  payments: Payment[];
  busRequests: BusRequest[];
  stops: Stop[];
}

type Tab = "fleet" | "complaints" | "revenue";

const STATUS_OPTIONS = ["Running", "Not Running", "Delayed"] as const;

export function OperatorDashboard({ operator, buses, complaints, payments, busRequests, stops }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("fleet");
  const [isPending, startTransition] = useTransition();
  const [busRequestOpen, setBusRequestOpen] = useState(false);

  const cardStyle  = { background: "var(--bg-surface)", borderColor: "var(--border-default)" };
  const inputStyle = { background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" };

  // ── Computed stats ─────────────────────────────────────────────────────────
  const totalSeats     = buses.reduce((s, b) => s + b.totalSeats, 0);
  const occupiedSeats  = buses.reduce((s, b) => s + b.occupiedSeats, 0);
  const occupancyPct   = totalSeats ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

  const successPayments = payments.filter((p) => p.status === "success");
  const totalRevenue    = successPayments.reduce((s, p) => s + p.amount, 0);
  const todayRevenue    = successPayments
    .filter((p) => new Date(p.createdAt).toDateString() === new Date().toDateString())
    .reduce((s, p) => s + p.amount, 0);

  const pendingComplaints  = complaints.filter((c) => c.status === "pending");
  const resolvedComplaints = complaints.filter((c) => c.status === "resolved");

  const handleStatusChange = (busId: string, status: "Running" | "Not Running" | "Delayed") => {
    startTransition(async () => {
      const result = await updateBusStatusAction(busId, status);
      if (result.success) toast.success("Bus status updated");
      else toast.error(result.error ?? "Failed to update status");
    });
  };

  const handleResolve = (complaintId: string) => {
    startTransition(async () => {
      const result = await resolveComplaintAction(complaintId);
      if (result.success) toast.success("Complaint resolved");
      else toast.error(result.error ?? "Failed to resolve");
    });
  };

  const statusStyle = (s: string) => {
    if (s === "Running") return { background: "var(--status-running-bg)", color: "var(--status-running-text)", border: "1px solid var(--status-running-border)" };
    if (s === "Delayed")  return { background: "var(--status-delayed-bg)", color: "var(--status-delayed-text)", border: "1px solid var(--status-delayed-border)" };
    return { background: "var(--status-stopped-bg)", color: "var(--status-stopped-text)", border: "1px solid var(--status-stopped-border)" };
  };

  return (
    <div className="space-y-6">
      {/* ── Stats strip ── */}
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Buses"    value={buses.filter(b => b.status === "Running").length} />
        <StatCard label="Occupancy"       value={`${occupancyPct}%`} />
        <StatCard label="Today Revenue"   value={`₹${todayRevenue}`} accent />
        <StatCard label="Open Complaints" value={pendingComplaints.length} warn={pendingComplaints.length > 0} />
      </section>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b-2" style={{ borderColor: "var(--border-default)" }}>
        {([
          { id: "fleet",      label: "Fleet",      Icon: Bus          },
          { id: "complaints", label: "Complaints",  Icon: MessageSquare },
          { id: "revenue",    label: "Revenue",     Icon: TrendingUp   },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold uppercase tracking-wide"
            style={{
              color:        activeTab === id ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeTab === id ? "2px solid #F4A522"   : "2px solid transparent",
              marginBottom: "-2px",
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Fleet tab ── */}
      {activeTab === "fleet" && (
        <section className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setBusRequestOpen(true)}
              className="h-10 rounded-none border-2 border-[#0D1B2A] bg-[#0E7C86] px-4 text-xs font-bold uppercase tracking-wide text-white transition-all hover:-translate-x-px hover:-translate-y-px"
              style={{ boxShadow: "3px 3px 0 #0D1B2A" }}
            >
              <Plus className="mr-1.5 inline h-4 w-4" />
              Request Bus Registration
            </button>
          </div>
          {buses.length === 0 && (
            <p className="ticket-stub rounded-lg p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
              No buses assigned to your account yet. Request bus registration or contact admin.
            </p>
          )}
          {buses.map((bus) => (
            <div key={bus.id} className="rounded-lg border-2 p-5" style={cardStyle}>
              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p
                    className="text-4xl font-extrabold"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
                  >
                    {bus.number}
                  </p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {bus.origin} → {bus.destination}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {bus.licensePlate} · {bus.occupiedSeats}/{bus.totalSeats} seats
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-surface-3)" }}>
                    <div
                      className="h-full rounded-full bg-[#0E7C86] transition-all"
                      style={{ width: `${Math.round((bus.occupiedSeats / bus.totalSeats) * 100)}%` }}
                    />
                  </div>
                  <span className="mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold" style={statusStyle(bus.status)}>
                    {bus.status}
                  </span>
                </div>

                {/* Status select */}
                <select
                  defaultValue={bus.status}
                  onChange={(e) => handleStatusChange(bus.id, e.target.value as typeof bus.status)}
                  disabled={isPending}
                  className="h-10 w-44 border-2 px-2 text-sm outline-none disabled:opacity-50"
                  style={inputStyle}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <Link
                  href={`/bus/${bus.id}`}
                  className="inline-flex h-10 items-center rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800"
                >
                  View Page
                </Link>
              </div>
            </div>
          ))}

          {/* My Bus Requests */}
          <div className="mt-8">
            <h3
              className="mb-3 text-xl font-extrabold uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
            >
              My Bus Requests
            </h3>
            {busRequests.length === 0 ? (
              <p className="rounded-none border-2 border-dashed p-5 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}>
                No bus registration requests yet.
              </p>
            ) : (
              <div className="space-y-3">
                {busRequests.map((req) => (
                  <article
                    key={req.id}
                    className="rounded-none border-2 p-4"
                    style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", boxShadow: "4px 4px 0 #0D1B2A" }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p
                          className="text-xl font-extrabold"
                          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
                        >
                          {req.number}
                        </p>
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {req.origin} &#8594; {req.destination}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Date(req.createdAt).toLocaleString("en-IN")}
                        </p>
                        <div className="mt-1">
                          <StatusBadge status={req.status} />
                        </div>
                        {req.status === "rejected" && req.adminNote && (
                          <div
                            className="mt-3 rounded-none border-2 border-red-600 bg-red-50 p-3 text-sm dark:bg-red-950/30"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            <p className="text-xs font-semibold uppercase" style={{ color: "var(--status-stopped-text)" }}>
                              Admin Note
                            </p>
                            <p className="mt-1">{req.adminNote}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Bus Request Modal */}
      {busRequestOpen && (
        <OperatorBusRequestModal
          stops={stops}
          onClose={() => setBusRequestOpen(false)}
          onSubmit={(data) => {
            startTransition(async () => {
              const result = await submitBusRequestAction(data);
              if (result.success) {
                toast.success("Bus registration request submitted");
                setBusRequestOpen(false);
              } else toast.error(result.error ?? "Failed");
            });
          }}
          isPending={isPending}
        />
      )}

      {/* ── Complaints tab ── */}
      {activeTab === "complaints" && (
        <section className="space-y-3">
          {complaints.length === 0 ? (
            <p className="ticket-stub rounded-lg p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
              No complaints received yet.
            </p>
          ) : (
            complaints.map((c) => (
              <article key={c.id} className="ticket-stub rounded-lg p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{c.id.slice(0, 8)}</p>
                    <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {c.busNumber} · {c.category}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{c.description}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(c.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                      style={c.status === "resolved"
                        ? { background: "var(--status-running-bg)", color: "var(--status-running-text)", borderColor: "var(--status-running-border)" }
                        : { background: "var(--status-delayed-bg)", color: "var(--status-delayed-text)", borderColor: "var(--status-delayed-border)" }}
                    >
                      {c.status}
                    </span>
                    {c.status === "pending" && (
                      <button
                        onClick={() => handleResolve(c.id)}
                        disabled={isPending}
                        className="h-8 border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-bold uppercase text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {/* ── Revenue tab ── */}
      {activeTab === "revenue" && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total Revenue"     value={`₹${totalRevenue}`} accent />
            <StatCard label="Total Transactions" value={successPayments.length} />
            <StatCard label="Avg per Trip"       value={successPayments.length ? `₹${Math.round(totalRevenue / successPayments.length)}` : "₹0"} />
          </div>

          {/* Per-bus revenue */}
          <div className="rounded-lg border-2 p-5" style={cardStyle}>
            <p
              className="mb-4 text-xl font-extrabold uppercase"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
            >
              Revenue by Bus
            </p>
            {buses.map((bus) => {
              const busRevenue = successPayments
                .filter((p) => p.busId === bus.id)
                .reduce((s, p) => s + p.amount, 0);
              const busTrips = successPayments.filter((p) => p.busId === bus.id).length;
              const pct = totalRevenue ? Math.round((busRevenue / totalRevenue) * 100) : 0;

              return (
                <div key={bus.id} className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{bus.number}</span>
                    <span className="font-bold text-[#0E7C86]">₹{busRevenue} <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>({busTrips} trips)</span></span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-surface-3)" }}>
                    <div className="h-full rounded-full bg-[#0E7C86] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent transactions */}
          <div className="rounded-lg border-2 p-5" style={cardStyle}>
            <p
              className="mb-3 text-xl font-extrabold uppercase"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
            >
              Recent Payments
            </p>
            {payments.slice(0, 15).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b py-2 text-sm last:border-0"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
              >
                <span>{p.busNumber} · {p.upiId ?? "UPI"}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#0E7C86]">₹{p.amount}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(p.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No payments recorded yet.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function OperatorBusRequestModal({
  stops,
  onClose,
  onSubmit,
  isPending,
}: {
  stops: Stop[];
  onClose: () => void;
  onSubmit: (data: {
    number: string;
    licensePlate: string;
    origin: string;
    destination: string;
    fullFare: number;
    driverName: string;
    conductorName: string;
    totalSeats: number;
    schedule: string[];
    womenReservedTotal: number;
    studentCardAccepted: boolean;
    studentDiscountPercent: number;
    routeStopIds: string[];
    operatorAadhaar?: string;
    operatorLicense?: string;
    rcNumber?: string;
    pollutionCertNumber?: string;
    insurancePolicyNumber?: string;
  }) => void;
  isPending: boolean;
}) {
  const [number, setNumber] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [fullFare, setFullFare] = useState("");
  const [driverName, setDriverName] = useState("");
  const [conductorName, setConductorName] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [womenReservedTotal, setWomenReservedTotal] = useState("0");
  const [studentCardAccepted, setStudentCardAccepted] = useState(false);
  const [studentDiscountPercent, setStudentDiscountPercent] = useState("0");
  const [schedule, setSchedule] = useState<string[]>([]);
  const [newTime, setNewTime] = useState("");
  const [routeStopIds, setRouteStopIds] = useState<string[]>([]);
  const [operatorAadhaar, setOperatorAadhaar] = useState("");
  const [operatorLicense, setOperatorLicense] = useState("");
  const [rcNumber, setRcNumber] = useState("");
  const [pollutionCertNumber, setPollutionCertNumber] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");

  const stopNames = stops.map((s) => s.name);
  const inputClass = "h-11 w-full rounded-none border-2 px-3 text-sm outline-none";
  const inputStyle = { background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" };

  const handleAddTime = () => {
    if (newTime.trim()) {
      setSchedule((s) => [...s, newTime.trim()]);
      setNewTime("");
    }
  };

  const toggleStop = (stopId: string) => {
    setRouteStopIds((ids) =>
      ids.includes(stopId) ? ids.filter((id) => id !== stopId) : [...ids, stopId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fare = parseInt(fullFare, 10);
    const seats = parseInt(totalSeats, 10);
    const women = parseInt(womenReservedTotal, 10);
    const discount = parseInt(studentDiscountPercent, 10);
    if (!number || !licensePlate || !origin || !destination || isNaN(fare) || !driverName || !conductorName || isNaN(seats)) return;
    onSubmit({
      number,
      licensePlate,
      origin,
      destination,
      fullFare: fare,
      driverName,
      conductorName,
      totalSeats: seats,
      schedule,
      womenReservedTotal: women,
      studentCardAccepted,
      studentDiscountPercent: discount,
      routeStopIds,
      operatorAadhaar: operatorAadhaar || undefined,
      operatorLicense: operatorLicense || undefined,
      rcNumber: rcNumber || undefined,
      pollutionCertNumber: pollutionCertNumber || undefined,
      insurancePolicyNumber: insurancePolicyNumber || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-none border-2 border-[#0D1B2A] bg-[var(--bg-surface)] p-6"
        style={{ boxShadow: "6px 6px 0 #0D1B2A" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-2xl font-extrabold uppercase tracking-wide"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
          >
            Request Bus Registration
          </h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-none border-2 border-[#0D1B2A]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Bus Number</label>
            <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className={inputClass} style={inputStyle} required />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>License Plate</label>
            <input type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className={inputClass} style={inputStyle} required />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Origin</label>
              <input type="text" list="op-stop-names" value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputClass} style={inputStyle} required />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Destination</label>
              <input type="text" list="op-stop-names" value={destination} onChange={(e) => setDestination(e.target.value)} className={inputClass} style={inputStyle} required />
            </div>
          </div>
          <datalist id="op-stop-names">{stopNames.map((n) => <option key={n} value={n} />)}</datalist>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Full Fare (&#8377;)</label>
              <input type="number" min={1} value={fullFare} onChange={(e) => setFullFare(e.target.value)} className={inputClass} style={inputStyle} required />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Total Seats</label>
              <input type="number" min={1} value={totalSeats} onChange={(e) => setTotalSeats(e.target.value)} className={inputClass} style={inputStyle} required />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Driver Name</label>
              <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} className={inputClass} style={inputStyle} required />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Conductor Name</label>
              <input type="text" value={conductorName} onChange={(e) => setConductorName(e.target.value)} className={inputClass} style={inputStyle} required />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Women Reserved Seats</label>
              <input type="number" min={0} value={womenReservedTotal} onChange={(e) => setWomenReservedTotal(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Student Card Accepted</label>
              <label className="flex h-11 items-center gap-2">
                <input type="checkbox" checked={studentCardAccepted} onChange={(e) => setStudentCardAccepted(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Yes</span>
              </label>
              {studentCardAccepted && (
                <input type="number" min={0} max={100} value={studentDiscountPercent} onChange={(e) => setStudentDiscountPercent(e.target.value)} placeholder="Discount %" className={`mt-2 ${inputClass}`} style={inputStyle} />
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Schedule (HH:MM)</label>
            <div className="flex gap-2">
              <input type="text" placeholder="HH:MM" value={newTime} onChange={(e) => setNewTime(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTime())} className={inputClass} style={inputStyle} />
              <button type="button" onClick={handleAddTime} className="h-11 rounded-none border-2 border-[#0D1B2A] bg-[#0E7C86] px-4 text-sm font-bold text-white">Add Time</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {schedule.map((t, i) => (
                <span key={i} className="flex items-center gap-1 rounded-none border-2 px-2 py-1 text-xs" style={{ borderColor: "var(--border-default)" }}>
                  {t}
                  <button type="button" onClick={() => setSchedule((s) => s.filter((_, idx) => idx !== i))} className="text-red-600 hover:underline"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Route Stops</label>
            <div className="flex flex-wrap gap-1">
              {stops.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStop(s.id)}
                  className={`rounded-none border-2 px-2 py-1 text-xs font-semibold ${routeStopIds.includes(s.id) ? "border-[#0D1B2A] bg-[#0E7C86] text-white" : "border-[var(--border-default)]"}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t-2 border-dashed pt-4" style={{ borderColor: "var(--border-medium)" }}>
            <p className="mb-3 text-sm font-bold uppercase" style={{ color: "var(--text-primary)" }}>Document Details (for admin review)</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Aadhar Number</label>
                <input type="text" value={operatorAadhaar} onChange={(e) => setOperatorAadhaar(e.target.value)} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Driving License Number</label>
                <input type="text" value={operatorLicense} onChange={(e) => setOperatorLicense(e.target.value)} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>RC Number</label>
                <input type="text" value={rcNumber} onChange={(e) => setRcNumber(e.target.value)} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Pollution Certificate Number</label>
                <input type="text" value={pollutionCertNumber} onChange={(e) => setPollutionCertNumber(e.target.value)} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Insurance Policy Number</label>
                <input type="text" value={insurancePolicyNumber} onChange={(e) => setInsurancePolicyNumber(e.target.value)} className={inputClass} style={inputStyle} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-none border-2 border-[#0D1B2A] bg-white px-4 text-xs font-bold uppercase text-[#0D1B2A]" style={{ boxShadow: "3px 3px 0 #0D1B2A" }}>Cancel</button>
            <button type="submit" disabled={isPending} className="h-10 rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-4 text-xs font-bold uppercase text-[#0D1B2A]" style={{ boxShadow: "3px 3px 0 #0D1B2A" }}>Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({
  label, value, accent, warn,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border-2 p-5" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p
        className={`mt-1 text-4xl font-extrabold ${warn ? "text-red-500" : accent ? "text-[#F4A522]" : "text-[#0E7C86]"}`}
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
}