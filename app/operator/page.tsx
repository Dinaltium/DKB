"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BarChart2, Bus, MessageSquare, RefreshCw } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import {
  BUSES,
  BUS_MAP,
  OPERATORS,
  OPERATOR_CREDS,
  OPERATOR_MAP,
  getStop,
} from "@/lib/data";
import type { BusStatus, Complaint, Operator } from "@/lib/types";

const STATUS_OPTIONS: BusStatus[] = ["Running", "Not Running", "Delayed"];

const STATUS_BADGE: Record<BusStatus, string> = {
  Running: "bg-emerald-50 text-emerald-700 border border-emerald-300",
  "Not Running": "bg-rose-50 text-rose-700 border border-rose-300",
  Delayed: "bg-amber-50 text-amber-700 border border-amber-300",
};

export default function OperatorPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"buses" | "complaints" | "stats">(
    "buses",
  );
  const [busStatuses, setBusStatuses] = useState<Record<string, BusStatus>>({});
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    try {
      const overrides = JSON.parse(
        localStorage.getItem("buslink_bus_status") ?? "{}",
      ) as Record<string, BusStatus>;
      setBusStatuses(overrides);
    } catch {}

    try {
      const stored = JSON.parse(
        localStorage.getItem("buslink_complaints") ?? "[]",
      ) as Complaint[];
      setComplaints(stored);
    } catch {}
  }, []);

  const handleLogin = () => {
    const cred = OPERATOR_CREDS[email.trim()];
    if (!cred || cred.password !== password) {
      toast.error("Invalid email or password");
      return;
    }
    const op = OPERATOR_MAP[cred.operatorId];
    if (!op) {
      toast.error("Operator not found");
      return;
    }
    if (!op.approved) {
      toast.error("Your account is pending approval by admin");
      return;
    }
    setCurrentOperator(op);
    setLoggedIn(true);
    toast.success(`Welcome, ${op.name}`);
  };

  const updateStatus = (busId: string, status: BusStatus) => {
    const next = { ...busStatuses, [busId]: status };
    setBusStatuses(next);
    try {
      localStorage.setItem("buslink_bus_status", JSON.stringify(next));
    } catch {}
    toast.success("Bus status updated");
  };

  const refreshData = () => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("buslink_complaints") ?? "[]",
      ) as Complaint[];
      setComplaints(stored);
    } catch {}
    toast.success("Data refreshed");
  };

  if (!loggedIn) {
    return (
      <AppShell
        title="Operator Login"
        subtitle="Login to manage your bus fleet"
      >
        <div className="mx-auto max-w-md">
          <div className="ticket-stub rounded-lg p-6">
            <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
              Demo credentials
            </p>
            <p className="mb-4 text-xs text-slate-500 font-mono">
              coastal@express.com / demo123
              <br />
              operator@udupitravel.com / demo123
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full border-2 border-slate-300 px-3 text-sm outline-none focus:border-[#0D1B2A]"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="h-11 w-full border-2 border-slate-300 px-3 text-sm outline-none focus:border-[#0D1B2A]"
              />
              <button
                onClick={handleLogin}
                className="h-11 w-full rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-amber-400"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const opBuses = (currentOperator!.busIds ?? [])
    .map((id) => BUS_MAP[id])
    .filter(Boolean);

  const opComplaints = complaints.filter((c) =>
    opBuses.some((b) => b.number === c.busNumber),
  );

  const totalSeats = opBuses.reduce((a, b) => a + b.totalSeats, 0);
  const occupiedSeats = opBuses.reduce((a, b) => a + b.occupiedSeats, 0);
  const dailyTrips = opBuses.reduce((a, b) => a + b.schedule.length, 0);

  return (
    <AppShell title="Operator Dashboard" subtitle={currentOperator!.name}>
      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-2 border-b-2 border-slate-200">
        {(["buses", "complaints", "stats"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
              activeTab === tab
                ? "border-b-2 border-[#F4A522] text-[#0D1B2A]"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "buses" && <Bus className="h-4 w-4" />}
            {tab === "complaints" && <MessageSquare className="h-4 w-4" />}
            {tab === "stats" && <BarChart2 className="h-4 w-4" />}
            {tab}
          </button>
        ))}
        <button
          onClick={refreshData}
          className="ml-auto flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-slate-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── Buses tab ── */}
      {activeTab === "buses" && (
        <section data-testid="operator-buses-section" className="space-y-4">
          {opBuses.length === 0 && (
            <p className="ticket-stub rounded-lg p-5 text-sm text-slate-600">
              No buses assigned to your account.
            </p>
          )}
          {opBuses.map((bus) => {
            const effectiveStatus = busStatuses[bus.id] ?? bus.status;
            return (
              <div
                key={bus.id}
                className="rounded-lg border-2 border-slate-200 bg-white p-5"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p
                      className="text-4xl font-extrabold text-[#0D1B2A]"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                      data-testid={`operator-bus-number-${bus.number.toLowerCase()}`}
                    >
                      {bus.number}
                    </p>
                    <p className="text-sm text-slate-600">
                      {bus.origin} → {bus.destination}
                    </p>
                    <p className="text-xs text-slate-500">{bus.licensePlate}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[effectiveStatus]}`}
                    >
                      {effectiveStatus}
                    </span>
                  </div>

                  <select
                    value={effectiveStatus}
                    onChange={(e) =>
                      updateStatus(bus.id, e.target.value as BusStatus)
                    }
                    data-testid={`operator-status-select-${bus.number.toLowerCase()}`}
                    className="h-10 w-44 border-2 border-slate-300 bg-white px-2 text-sm outline-none focus:border-[#0D1B2A]"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <Link
                    href={`/bus/${bus.number}`}
                    className="inline-flex h-10 items-center rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800"
                  >
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
        <section
          data-testid="operator-complaints-section"
          className="space-y-3"
        >
          {opComplaints.length === 0 ? (
            <p
              data-testid="operator-no-complaints"
              className="ticket-stub rounded-lg p-5 text-sm text-slate-600"
            >
              No complaints received yet.
            </p>
          ) : (
            opComplaints.map((c) => (
              <article
                key={c.id}
                data-testid={`operator-complaint-${c.id.toLowerCase()}`}
                className="ticket-stub rounded-lg p-4"
              >
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  {c.id}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#0D1B2A]">
                  {c.busNumber} &bull; {c.category}
                </p>
                <p className="mt-1 text-sm text-slate-700">{c.description}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(c.timestamp).toLocaleString()}
                </p>
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
            <StatCard
              title="Occupancy"
              value={`${totalSeats ? Math.round((occupiedSeats / totalSeats) * 100) : 0}%`}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard title="Complaints" value={opComplaints.length} />
            <StatCard
              title="Resolved"
              value={opComplaints.filter((c) => c.status === "resolved").length}
            />
          </div>
        </section>
      )}
    </AppShell>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border-2 border-slate-300 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </p>
      <p
        className="mt-1 text-4xl font-extrabold text-[#0E7C86]"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
}
