"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BarChart2, Bus, MessageSquare, RefreshCw } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import { BUSES, BUS_MAP, OPERATORS, OPERATOR_CREDS, OPERATOR_MAP } from "@/lib/data";
import type { BusStatus, Complaint, Operator } from "@/lib/types";

const STATUS_OPTIONS: BusStatus[] = ["Running", "Not Running", "Delayed"];

export default function OperatorPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"buses" | "complaints" | "stats">("buses");
  const [busStatuses, setBusStatuses] = useState<Record<string, BusStatus>>({});
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    try {
      const overrides = JSON.parse(localStorage.getItem("buslink_bus_status") ?? "{}") as Record<string, BusStatus>;
      setBusStatuses(overrides);
    } catch {}
    try {
      const stored = JSON.parse(localStorage.getItem("buslink_complaints") ?? "[]") as Complaint[];
      setComplaints(stored);
    } catch {}
  }, []);

  const handleLogin = () => {
    const cred = OPERATOR_CREDS[email.trim()];
    if (!cred || cred.password !== password) { toast.error("Invalid email or password"); return; }
    const op = OPERATOR_MAP[cred.operatorId];
    if (!op) { toast.error("Operator not found"); return; }
    if (!op.approved) { toast.error("Your account is pending approval by admin"); return; }
    setCurrentOperator(op);
    setLoggedIn(true);
    toast.success(`Welcome, ${op.name}`);
  };

  const updateStatus = (busId: string, status: BusStatus) => {
    const next = { ...busStatuses, [busId]: status };
    setBusStatuses(next);
    try { localStorage.setItem("buslink_bus_status", JSON.stringify(next)); } catch {}
    toast.success("Bus status updated");
  };

  const refreshData = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("buslink_complaints") ?? "[]") as Complaint[];
      setComplaints(stored);
    } catch {}
    toast.success("Data refreshed");
  };

  const inputStyle = { background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" };
  const cardStyle = { background: "var(--bg-surface)", borderColor: "var(--border-default)" };

  const statusStyle = (s: BusStatus) => {
    if (s === "Running") return { background: "var(--status-running-bg)", color: "var(--status-running-text)", border: "1px solid var(--status-running-border)" };
    if (s === "Delayed") return { background: "var(--status-delayed-bg)", color: "var(--status-delayed-text)", border: "1px solid var(--status-delayed-border)" };
    return { background: "var(--status-stopped-bg)", color: "var(--status-stopped-text)", border: "1px solid var(--status-stopped-border)" };
  };

  if (!loggedIn) {
    return (
      <AppShell title="Operator Login" subtitle="Login to manage your bus fleet">
        <div className="mx-auto max-w-md">
          <div className="ticket-stub rounded-lg p-6">
            <p className="mb-1 text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Demo credentials</p>
            <p className="mb-4 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
              coastal@express.com / demo123<br />
              operator@udupitravel.com / demo123
            </p>
            <div className="space-y-3">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full border-2 px-3 text-sm outline-none" style={inputStyle} />
              <input type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="h-11 w-full border-2 px-3 text-sm outline-none" style={inputStyle} />
              <button onClick={handleLogin}
                className="h-11 w-full rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-amber-400">
                Login
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const opBuses = (currentOperator!.busIds ?? []).map((id) => BUS_MAP[id]).filter(Boolean);
  const opComplaints = complaints.filter((c) => opBuses.some((b) => b.number === c.busNumber));
  const totalSeats = opBuses.reduce((a, b) => a + b.totalSeats, 0);
  const occupiedSeats = opBuses.reduce((a, b) => a + b.occupiedSeats, 0);
  const dailyTrips = opBuses.reduce((a, b) => a + b.schedule.length, 0);

  return (
    <AppShell title="Operator Dashboard" subtitle={currentOperator!.name}>
      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-2 border-b-2" style={{ borderColor: "var(--border-default)" }}>
        {(["buses", "complaints", "stats"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold uppercase tracking-wide ${activeTab === tab ? "border-b-2 border-[#F4A522]" : ""}`}
            style={{ color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)" }}>
            {tab === "buses" && <Bus className="h-4 w-4" />}
            {tab === "complaints" && <MessageSquare className="h-4 w-4" />}
            {tab === "stats" && <BarChart2 className="h-4 w-4" />}
            {tab}
          </button>
        ))}
        <button onClick={refreshData} className="ml-auto flex items-center gap-1 px-3 py-2 text-xs hover:opacity-80" style={{ color: "var(--text-muted)" }}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── Buses tab ── */}
      {activeTab === "buses" && (
        <section data-testid="operator-buses-section" className="space-y-4">
          {opBuses.length === 0 && (
            <p className="ticket-stub rounded-lg p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
              No buses assigned to your account.
            </p>
          )}
          {opBuses.map((bus) => {
            const effectiveStatus = busStatuses[bus.id] ?? bus.status;
            return (
              <div key={bus.id} className="rounded-lg border-2 p-5" style={cardStyle}>
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p className="text-4xl font-extrabold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
                      data-testid={`operator-bus-number-${bus.number.toLowerCase()}`}>
                      {bus.number}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{bus.origin} → {bus.destination}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{bus.licensePlate}</p>
                    <span className="mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold" style={statusStyle(effectiveStatus)}>
                      {effectiveStatus}
                    </span>
                  </div>
                  <select value={effectiveStatus} onChange={(e) => updateStatus(bus.id, e.target.value as BusStatus)}
                    data-testid={`operator-status-select-${bus.number.toLowerCase()}`}
                    className="h-10 w-44 border-2 px-2 text-sm outline-none"
                    style={inputStyle}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Link href={`/bus/${bus.number}`}
                    className="inline-flex h-10 items-center rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800">
                    View Public Page
                  </Link>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Complaints tab ── */}
      {activeTab === "complaints" && (
        <section data-testid="operator-complaints-section" className="space-y-3">
          {opComplaints.length === 0 ? (
            <p data-testid="operator-no-complaints" className="ticket-stub rounded-lg p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
              No complaints received yet.
            </p>
          ) : (
            opComplaints.map((c) => (
              <article key={c.id} data-testid={`operator-complaint-${c.id.toLowerCase()}`} className="ticket-stub rounded-lg p-4">
                <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{c.id}</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{c.busNumber} &bull; {c.category}</p>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{c.description}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{new Date(c.timestamp).toLocaleString()}</p>
              </article>
            ))
          )}
        </section>
      )}

      {/* ── Stats tab ── */}
      {activeTab === "stats" && (
        <section data-testid="operator-stats-section" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Daily Trips" value={dailyTrips} />
            <StatCard title="Total Seats" value={totalSeats} />
            <StatCard title="Occupancy" value={`${totalSeats ? Math.round((occupiedSeats / totalSeats) * 100) : 0}%`} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard title="Complaints" value={opComplaints.length} />
            <StatCard title="Resolved" value={opComplaints.filter((c) => c.status === "resolved").length} />
          </div>
        </section>
      )}
    </AppShell>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border-2 p-5" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{title}</p>
      <p className="mt-1 text-4xl font-extrabold text-[#0E7C86]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        {value}
      </p>
    </div>
  );
}