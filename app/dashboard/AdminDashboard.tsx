"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bus, ShieldCheck, Users, MessageSquare } from "lucide-react";
import {
  setOperatorApprovalAction,
  resolveComplaintAction,
} from "@/lib/actions/bus";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import type { Bus as BusType, Complaint, Operator } from "@/lib/db/schema";

interface OperatorRow {
  operator: Operator;
  user: { name: string | null; email: string | null };
}

interface Props {
  buses: BusType[];
  operators: OperatorRow[];
  complaints: Complaint[];
}

type Tab = "operators" | "buses" | "complaints";

export function AdminDashboard({ buses, operators, complaints }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("operators");
  const [isPending, startTransition] = useTransition();

  const cardStyle = {
    background: "var(--bg-surface)",
    borderColor: "var(--border-default)",
  };

  const pendingOperators = operators.filter((r) => !r.operator.approved);
  const pendingComplaints = complaints.filter((c) => c.status === "pending");

  const handleApproval = (operatorId: string, approved: boolean) => {
    startTransition(async () => {
      const result = await setOperatorApprovalAction(operatorId, approved);
      if (result.success)
        toast.success(`Operator ${approved ? "approved" : "rejected"}`);
      else toast.error(result.error ?? "Failed");
    });
  };

  const handleResolve = (complaintId: string) => {
    startTransition(async () => {
      const result = await resolveComplaintAction(complaintId);
      if (result.success) toast.success("Complaint resolved");
      else toast.error(result.error ?? "Failed");
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Summary strip ── */}
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          icon={<Bus className="h-5 w-5 text-[#0E7C86]" />}
          label="Total Buses"
          value={buses.length}
        />
        <SummaryCard
          icon={<Users className="h-5 w-5 text-[#0E7C86]" />}
          label="Operators"
          value={operators.length}
        />
        <SummaryCard
          icon={<ShieldCheck className="h-5 w-5 text-amber-500" />}
          label="Pending Approval"
          value={pendingOperators.length}
          warn={pendingOperators.length > 0}
        />
        <SummaryCard
          icon={<MessageSquare className="h-5 w-5 text-red-500" />}
          label="Open Complaints"
          value={pendingComplaints.length}
          warn={pendingComplaints.length > 0}
        />
      </section>

      {/* ── Tabs ── */}
      <div
        className="flex gap-2 border-b-2"
        style={{ borderColor: "var(--border-default)" }}
      >
        {(
          [
            { id: "operators", label: "Operators" },
            { id: "buses", label: "Buses" },
            { id: "complaints", label: "Complaints" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="px-4 py-2 text-sm font-semibold uppercase tracking-wide"
            style={{
              color:
                activeTab === id ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom:
                activeTab === id
                  ? "2px solid #F4A522"
                  : "2px solid transparent",
              marginBottom: "-2px",
            }}
          >
            {label}
            {id === "operators" && pendingOperators.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingOperators.length}
              </span>
            )}
            {id === "complaints" && pendingComplaints.length > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingComplaints.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Operators tab ── */}
      {activeTab === "operators" && (
        <section className="space-y-3">
          {operators.length === 0 && (
            <EmptyState
              title="No operators yet"
              description="No operator accounts have been registered. Operators can sign up and request approval."
            />
          )}
          {operators.map(({ operator, user }) => (
            <article
              key={operator.id}
              className="rounded-lg border-2 p-4"
              style={cardStyle}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    className="font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {operator.companyName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {user.email}
                  </p>
                  <p
                    className="mt-0.5 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {operator.approved ? "Approved" : "Pending approval"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproval(operator.id, true)}
                    disabled={isPending || operator.approved}
                    className="h-9 border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-bold uppercase text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval(operator.id, false)}
                    disabled={isPending || !operator.approved}
                    className="h-9 border-2 border-rose-700 bg-rose-600 px-3 text-xs font-bold uppercase text-white hover:bg-rose-700 disabled:opacity-40"
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
        <section className="space-y-3">
          {buses.length === 0 && (
            <EmptyState
              title="No buses registered"
              description="No buses have been added to the platform yet. Approved operators can add buses from their dashboard."
            />
          )}
          {buses.map((bus) => (
            <article
              key={bus.id}
              className="rounded-lg border-2 p-4"
              style={cardStyle}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    className="text-3xl font-extrabold"
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      color: "var(--text-primary)",
                    }}
                  >
                    {bus.number}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {bus.origin} &#8594; {bus.destination}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {bus.licensePlate} &middot; {bus.occupiedSeats}/
                    {bus.totalSeats} seats
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={bus.status} />
                  </div>
                </div>
                <Link
                  href={`/bus/${bus.id}`}
                  className="inline-flex h-9 items-center border-2 border-[#0D1B2A] bg-[#0D1B2A] px-3 text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-80"
                >
                  View
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* ── Complaints tab ── */}
      {activeTab === "complaints" && (
        <section className="space-y-3">
          {complaints.length === 0 && (
            <EmptyState
              title="No complaints"
              description="No complaints have been submitted yet."
            />
          )}
          {complaints.map((c) => (
            <article
              key={c.id}
              className="rounded-lg border-2 p-4"
              style={cardStyle}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p
                    className="font-mono text-xs uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    #{c.id.slice(0, 8)}
                  </p>
                  <p
                    className="mt-1 text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {c.busNumber} &middot; {c.category}
                  </p>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {c.description}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {new Date(c.createdAt).toLocaleString("en-IN")}
                    </p>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                {c.status === "pending" && (
                  <button
                    onClick={() => handleResolve(c.id)}
                    disabled={isPending}
                    className="h-8 border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-bold uppercase text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div
      className="rounded-lg border-2 p-5"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
      </div>
      <p
        className={`mt-2 text-4xl font-extrabold ${warn ? "text-amber-500" : "text-[#0E7C86]"}`}
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
}
