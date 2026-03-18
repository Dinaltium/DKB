"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BarChart2, Bus, MessageSquare, RefreshCw, TrendingUp } from "lucide-react";
import { updateBusStatusAction, resolveComplaintAction } from "@/lib/actions/bus";
import type { Bus as BusType, Complaint, Operator, Payment } from "@/lib/db/schema";

interface Props {
  operator:   Operator;
  buses:      BusType[];
  complaints: Complaint[];
  payments:   Payment[];
}

type Tab = "fleet" | "complaints" | "revenue";

const STATUS_OPTIONS = ["Running", "Not Running", "Delayed"] as const;

export function OperatorDashboard({ operator, buses, complaints, payments }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("fleet");
  const [isPending, startTransition] = useTransition();

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
          {buses.length === 0 && (
            <p className="ticket-stub rounded-lg p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
              No buses assigned to your account yet. Contact admin to add buses.
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
        </section>
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