"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bus, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import { ADMIN_CREDS, BUSES, OPERATORS } from "@/lib/data";
import type { BusStatus, Complaint, Operator } from "@/lib/types";

const STATUS_BADGE: Record<BusStatus, string> = {
  Running: "bg-emerald-50 text-emerald-700 border border-emerald-300",
  "Not Running": "bg-rose-50 text-rose-700 border border-rose-300",
  Delayed: "bg-amber-50 text-amber-700 border border-amber-300",
};

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<
    "buses" | "operators" | "complaints"
  >("operators");
  const [operators, setOperators] = useState(OPERATORS.map((o) => ({ ...o })));
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [busStatuses, setBusStatuses] = useState<Record<string, BusStatus>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("buslink_complaints") ?? "[]",
      ) as Complaint[];
      setComplaints(stored);
    } catch {}
    try {
      const overrides = JSON.parse(
        localStorage.getItem("buslink_bus_status") ?? "{}",
      ) as Record<string, BusStatus>;
      setBusStatuses(overrides);
    } catch {}
  }, []);

  const handleLogin = () => {
    if (
      email.trim() === ADMIN_CREDS.email &&
      password === ADMIN_CREDS.password
    ) {
      setLoggedIn(true);
      toast.success("Welcome, Admin");
    } else {
      toast.error("Invalid credentials");
    }
  };

  const toggleApprove = (opId: string, approved: boolean) => {
    setOperators((prev) =>
      prev.map((o) => (o.id === opId ? { ...o, approved } : o)),
    );
    toast.success(`Operator ${approved ? "approved" : "rejected"}`);
  };

  const resolveComplaint = (complaintId: string) => {
    const updated = complaints.map((c) =>
      c.id === complaintId ? { ...c, status: "resolved" as const } : c,
    );
    setComplaints(updated);
    try {
      localStorage.setItem("buslink_complaints", JSON.stringify(updated));
    } catch {}
    toast.success("Complaint marked as resolved");
  };

  if (!loggedIn) {
    return (
      <AppShell title="Admin Login" subtitle="BusLink platform administration">
        <div className="mx-auto max-w-md">
          <div className="ticket-stub rounded-lg p-6">
            <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
              Admin credentials
            </p>
            <p className="mb-4 font-mono text-xs text-slate-500">
              admin@buslink.in / admin123
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Admin email"
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
                Login as Admin
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Admin Panel"
      subtitle="Manage buses, operators and complaints"
    >
      {/* ── Summary cards ── */}
      <section
        data-testid="admin-summary-cards"
        className="mb-6 grid gap-4 md:grid-cols-3"
      >
        <SummaryCard
          icon={<Bus className="h-5 w-5 text-[#0E7C86]" />}
          label="Total Buses"
          value={BUSES.length}
          testId="admin-total-buses"
        />
        <SummaryCard
          icon={<Users className="h-5 w-5 text-[#0E7C86]" />}
          label="Operators"
          value={operators.length}
          testId="admin-total-operators"
        />
        <SummaryCard
          icon={<ShieldCheck className="h-5 w-5 text-[#0E7C86]" />}
          label="Complaints"
          value={complaints.length}
          testId="admin-total-complaints"
        />
      </section>

      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-2 border-b-2 border-slate-200">
        {(["operators", "buses", "complaints"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
              activeTab === tab
                ? "border-b-2 border-[#F4A522] text-[#0D1B2A]"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Operators tab ── */}
      {activeTab === "operators" && (
        <section data-testid="admin-operators-section" className="space-y-3">
          {operators.map((op) => (
            <article
              key={op.id}
              data-testid={`admin-operator-row-${op.id}`}
              className="ticket-stub rounded-lg p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    className="text-sm font-semibold text-[#0D1B2A]"
                    data-testid={`admin-operator-name-${op.id}`}
                  >
                    {op.name}
                  </p>
                  <p className="text-xs text-slate-500">{op.email}</p>
                  <p
                    className="mt-0.5 text-xs text-slate-600"
                    data-testid={`admin-operator-status-${op.id}`}
                  >
                    {op.approved ? "✓ Approved" : "⏳ Pending approval"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Buses:{" "}
                    {op.busIds.map((id) => (
                      <Link
                        key={id}
                        href={`/bus/${id}`}
                        className="mr-1 rounded border border-slate-300 px-1 text-xs text-[#0E7C86] hover:underline"
                      >
                        {id}
                      </Link>
                    ))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    data-testid={`admin-approve-operator-${op.id}`}
                    onClick={() => toggleApprove(op.id, true)}
                    disabled={op.approved}
                    className="h-9 rounded-none border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    data-testid={`admin-reject-operator-${op.id}`}
                    onClick={() => toggleApprove(op.id, false)}
                    disabled={!op.approved}
                    className="h-9 rounded-none border-2 border-rose-700 bg-rose-600 px-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-rose-700 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* ── Buses tab ── */}
      {activeTab === "buses" && (
        <section data-testid="admin-buses-section" className="space-y-3">
          {BUSES.map((bus) => {
            const effectiveStatus = busStatuses[bus.id] ?? bus.status;
            return (
              <article
                key={bus.id}
                data-testid={`admin-bus-row-${bus.number.toLowerCase()}`}
                className="rounded-lg border-2 border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p
                      className="text-3xl font-extrabold text-[#0D1B2A]"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                      data-testid={`admin-bus-number-${bus.number.toLowerCase()}`}
                    >
                      {bus.number}
                    </p>
                    <p
                      className="text-sm text-slate-600"
                      data-testid={`admin-bus-route-${bus.number.toLowerCase()}`}
                    >
                      {bus.origin} → {bus.destination}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[effectiveStatus]}`}
                      data-testid={`admin-bus-status-${bus.number.toLowerCase()}`}
                    >
                      {effectiveStatus}
                    </span>
                  </div>
                  <Link
                    href={`/bus/${bus.number}`}
                    className="inline-flex h-9 items-center rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] px-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800"
                  >
                    View
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ── Complaints tab ── */}
      {activeTab === "complaints" && (
        <section data-testid="admin-complaints-section" className="space-y-3">
          {complaints.length === 0 ? (
            <p className="ticket-stub rounded-lg p-5 text-sm text-slate-600">
              No complaints submitted yet.
            </p>
          ) : (
            complaints.map((c) => (
              <article
                key={c.id}
                data-testid={`admin-complaint-row-${c.id.toLowerCase()}`}
                className="rounded-lg border-2 border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p
                      className="text-xs uppercase tracking-wider text-slate-500"
                      data-testid={`admin-complaint-id-${c.id.toLowerCase()}`}
                    >
                      {c.id}
                    </p>
                    <p
                      className="text-sm font-semibold text-[#0D1B2A]"
                      data-testid={`admin-complaint-category-${c.id.toLowerCase()}`}
                    >
                      {c.busNumber} &bull; {c.category}
                    </p>
                    <p
                      className="mt-1 text-sm text-slate-700"
                      data-testid={`admin-complaint-description-${c.id.toLowerCase()}`}
                    >
                      {c.description}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(c.timestamp).toLocaleString()} &bull;{" "}
                      <span
                        className={
                          c.status === "resolved"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }
                      >
                        {c.status}
                      </span>
                    </p>
                  </div>
                  {c.status === "pending" && (
                    <button
                      onClick={() => resolveComplaint(c.id)}
                      className="h-8 rounded-none border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </AppShell>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  testId: string;
}) {
  return (
    <div className="rounded-lg border-2 border-slate-300 bg-white p-5">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </p>
      </div>
      <p
        className="mt-2 text-4xl font-extrabold text-[#0E7C86]"
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        data-testid={testId}
      >
        {value}
      </p>
    </div>
  );
}
