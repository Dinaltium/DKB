"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bus,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Plus,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  setOperatorApprovalAction,
  resolveComplaintAction,
  approveBusRequestAction,
  rejectBusRequestAction,
  adminAddBusAction,
  reassignBusAction,
} from "@/lib/actions/bus";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import type { Bus as BusType, Complaint, Operator, Stop } from "@/lib/db/schema";
import type { BusRequest } from "@/lib/db/schema";

interface OperatorRow {
  operator: Operator;
  user: { name: string | null; email: string | null };
}

interface BusRequestRow {
  request: BusRequest;
  operator: Operator;
  user: { name: string | null; email: string | null };
}

interface Props {
  buses: BusType[];
  operators: OperatorRow[];
  complaints: Complaint[];
  busRequests: BusRequestRow[];
  stops: Stop[];
}

type Tab = "operators" | "buses" | "complaints";
type BusSubTab = "all" | "requests" | "approvals";

const cardStyle = {
  background: "var(--bg-surface)",
  borderColor: "var(--border-default)",
};

const btnBase =
  "h-10 rounded-none border-2 border-[#0D1B2A] px-4 text-xs font-bold uppercase tracking-wide transition-all hover:-translate-x-px hover:-translate-y-px disabled:opacity-50";
const btnPrimary = `${btnBase} bg-[#F4A522] text-[#0D1B2A]`;
const btnSecondary = `${btnBase} bg-white text-[#0D1B2A]`;

export function AdminDashboard({
  buses,
  operators,
  complaints,
  busRequests,
  stops,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("operators");
  const [busSubTab, setBusSubTab] = useState<BusSubTab>("all");
  const [isPending, startTransition] = useTransition();
  const [reviewRequest, setReviewRequest] = useState<BusRequestRow | null>(null);
  const [addBusOpen, setAddBusOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  const pendingOperators = operators.filter((r) => !r.operator.approved);
  const pendingComplaints = complaints.filter((c) => c.status === "pending");
  const pendingBusRequests = busRequests.filter((r) => r.request.status === "pending");

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

  const handleApproveRequest = (requestId: string) => {
    startTransition(async () => {
      const result = await approveBusRequestAction(requestId);
      if (result.success) {
        toast.success("Bus request approved");
        setReviewRequest(null);
      } else toast.error(result.error ?? "Failed");
    });
  };

  const handleRejectRequest = (requestId: string, note?: string) => {
    startTransition(async () => {
      const result = await rejectBusRequestAction(requestId, note);
      if (result.success) {
        toast.success("Bus request rejected");
        setReviewRequest(null);
        setShowRejectInput(null);
        setRejectNote("");
      } else toast.error(result.error ?? "Failed");
    });
  };

  const handleReassign = (busId: string, newOperatorId: string) => {
    startTransition(async () => {
      const result = await reassignBusAction(busId, newOperatorId);
      if (result.success) toast.success("Bus reassigned");
      else toast.error(result.error ?? "Failed");
    });
  };

  const handleAddBus = (data: {
    number: string;
    operatorId: string;
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
  }) => {
    startTransition(async () => {
      const result = await adminAddBusAction(data);
      if (result.success) {
        toast.success("Bus added");
        setAddBusOpen(false);
      } else toast.error(result.error ?? "Failed");
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary strip */}
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
          value={pendingOperators.length + pendingBusRequests.length}
          warn={pendingOperators.length + pendingBusRequests.length > 0}
        />
        <SummaryCard
          icon={<MessageSquare className="h-5 w-5 text-red-500" />}
          label="Open Complaints"
          value={pendingComplaints.length}
          warn={pendingComplaints.length > 0}
        />
      </section>

      {/* Main tabs */}
      <div
        className="flex gap-2 border-b-2"
        style={{ borderColor: "var(--border-default)" }}
      >
        {[
          { id: "operators" as const, label: "Operators" },
          { id: "buses" as const, label: "Buses" },
          { id: "complaints" as const, label: "Complaints" },
        ].map(({ id, label }) => (
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
              <span
                className="ml-1.5 rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-1.5 py-0.5 text-[10px] font-bold text-[#0D1B2A]"
                style={{ boxShadow: "1px 1px 0 #0D1B2A" }}
              >
                {pendingOperators.length}
              </span>
            )}
            {id === "complaints" && pendingComplaints.length > 0 && (
              <span
                className="ml-1.5 rounded-none border-2 border-[#0D1B2A] bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                style={{ boxShadow: "1px 1px 0 #0D1B2A" }}
              >
                {pendingComplaints.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Operators tab */}
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
              className="rounded-none border-2 p-4"
              style={{ ...cardStyle, boxShadow: "4px 4px 0 #0D1B2A" }}
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
                    className="h-9 rounded-none border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-bold uppercase text-white transition-opacity hover:bg-emerald-700 disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval(operator.id, false)}
                    disabled={isPending || !operator.approved}
                    className="h-9 rounded-none border-2 border-rose-700 bg-rose-600 px-3 text-xs font-bold uppercase text-white transition-opacity hover:bg-rose-700 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Buses tab with sub-tabs */}
      {activeTab === "buses" && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b-2 pb-3" style={{ borderColor: "var(--border-default)" }}>
            {[
              { id: "all" as const, label: "All Buses" },
              {
                id: "requests" as const,
                label: "Bus Requests",
                badge: busRequests.length,
              },
              {
                id: "approvals" as const,
                label: "Approvals",
                badge: pendingBusRequests.length,
                highlight: pendingBusRequests.length > 0,
              },
            ].map(({ id, label, badge, highlight }) => (
              <button
                key={id}
                onClick={() => setBusSubTab(id)}
                className="flex items-center gap-1.5 rounded-none border-2 px-4 py-2 text-sm font-semibold uppercase tracking-wide"
                style={{
                  borderColor: busSubTab === id ? "#0D1B2A" : "var(--border-default)",
                  background: busSubTab === id ? "#F4A522" : "var(--bg-surface)",
                  color: busSubTab === id ? "#0D1B2A" : highlight ? "#F4A522" : "var(--text-muted)",
                  boxShadow: busSubTab === id ? "3px 3px 0 #0D1B2A" : "none",
                }}
              >
                {label}
                {badge !== undefined && badge > 0 && (
                  <span
                    className="rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-1.5 py-0.5 text-[10px] font-bold text-[#0D1B2A]"
                    style={{ boxShadow: "1px 1px 0 #0D1B2A" }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sub-tab: All Buses */}
          {busSubTab === "all" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={() => setAddBusOpen(true)}
                  className={btnPrimary}
                  style={{ boxShadow: "3px 3px 0 #0D1B2A" }}
                >
                  <Plus className="mr-1.5 inline h-4 w-4" />
                  Add Bus
                </button>
              </div>
              {buses.length === 0 && (
                <EmptyState
                  title="No buses registered"
                  description="Add a bus directly or wait for operator bus requests to approve."
                />
              )}
              {buses.map((bus) => (
                <article
                  key={bus.id}
                  className="rounded-none border-2 p-4"
                  style={{ ...cardStyle, boxShadow: "4px 4px 0 #0D1B2A" }}
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
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {bus.origin} &#8594; {bus.destination}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {bus.licensePlate} &middot; {bus.occupiedSeats}/{bus.totalSeats} seats
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={bus.status} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        defaultValue={bus.operatorId}
                        onChange={(e) => handleReassign(bus.id, e.target.value)}
                        disabled={isPending}
                        className="h-9 rounded-none border-2 px-2 text-sm outline-none"
                        style={{
                          background: "var(--input-bg)",
                          borderColor: "var(--input-border)",
                          color: "var(--input-text)",
                        }}
                      >
                        {operators.map(({ operator }) => (
                          <option key={operator.id} value={operator.id}>
                            {operator.companyName}
                            {!operator.approved ? " (pending)" : ""}
                          </option>
                        ))}
                      </select>
                      <Link
                        href={`/bus/${bus.id}`}
                        className={`inline-flex h-9 items-center ${btnSecondary}`}
                        style={{ boxShadow: "3px 3px 0 #0D1B2A" }}
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Sub-tab: Bus Requests (all) */}
          {busSubTab === "requests" && (
            <div className="space-y-3">
              {busRequests.length === 0 && (
                <EmptyState
                  title="No bus requests"
                  description="Operators can submit bus registration requests from their dashboard."
                />
              )}
              {busRequests.map((row) => (
                <article
                  key={row.request.id}
                  className="rounded-none border-2 p-4"
                  style={{ ...cardStyle, boxShadow: "4px 4px 0 #0D1B2A" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p
                        className="text-xl font-extrabold"
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          color: "var(--text-primary)",
                        }}
                      >
                        {row.request.number}
                      </p>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {row.request.origin} &#8594; {row.request.destination}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {row.operator.companyName} &middot; {row.user.email}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={row.request.status} />
                      </div>
                    </div>
                    <button
                      onClick={() => setReviewRequest(row)}
                      className={btnPrimary}
                      style={{ boxShadow: "3px 3px 0 #0D1B2A" }}
                    >
                      Review
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Sub-tab: Approvals (pending only) */}
          {busSubTab === "approvals" && (
            <div className="space-y-3">
              {pendingBusRequests.length === 0 && (
                <EmptyState
                  title="No pending approvals"
                  description="All bus requests have been processed."
                />
              )}
              {pendingBusRequests.map((row) => (
                <article
                  key={row.request.id}
                  className="rounded-none border-2 p-4"
                  style={{ ...cardStyle, boxShadow: "4px 4px 0 #0D1B2A" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p
                        className="text-xl font-extrabold"
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          color: "var(--text-primary)",
                        }}
                      >
                        {row.request.number}
                      </p>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {row.request.origin} &#8594; {row.request.destination}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {row.operator.companyName}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleApproveRequest(row.request.id)}
                        disabled={isPending}
                        className="h-9 rounded-none border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-bold uppercase text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          setShowRejectInput(
                            showRejectInput === row.request.id ? null : row.request.id
                          )
                        }
                        disabled={isPending}
                        className="h-9 rounded-none border-2 border-rose-700 bg-rose-600 px-3 text-xs font-bold uppercase text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setReviewRequest(row)}
                        className={btnSecondary}
                        style={{ boxShadow: "3px 3px 0 #0D1B2A" }}
                      >
                        Full Review
                      </button>
                    </div>
                  </div>
                  {showRejectInput === row.request.id && (
                    <div className="mt-4 flex gap-2">
                      <textarea
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Rejection reason (optional)"
                        rows={2}
                        className="flex-1 rounded-none border-2 px-3 py-2 text-sm outline-none"
                        style={{
                          background: "var(--input-bg)",
                          borderColor: "var(--input-border)",
                          color: "var(--input-text)",
                        }}
                      />
                      <button
                        onClick={() =>
                          handleRejectRequest(row.request.id, rejectNote || undefined)
                        }
                        disabled={isPending}
                        className="h-9 rounded-none border-2 border-rose-700 bg-rose-600 px-3 text-xs font-bold uppercase text-white"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Complaints tab */}
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
              className="rounded-none border-2 p-4"
              style={{ ...cardStyle, boxShadow: "4px 4px 0 #0D1B2A" }}
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
                    className="h-8 rounded-none border-2 border-emerald-700 bg-emerald-600 px-3 text-xs font-bold uppercase text-white transition-opacity hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Bus Request Detail Modal */}
      {reviewRequest && (
        <BusRequestDetailModal
          row={reviewRequest}
          stops={stops}
          onClose={() => setReviewRequest(null)}
          onApprove={() => handleApproveRequest(reviewRequest.request.id)}
          onReject={(note) => handleRejectRequest(reviewRequest.request.id, note)}
          isPending={isPending}
        />
      )}

      {/* Admin Add Bus Modal */}
      {addBusOpen && (
        <AdminAddBusModal
          operators={operators.filter((o) => o.operator.approved)}
          stops={stops}
          onClose={() => setAddBusOpen(false)}
          onSubmit={handleAddBus}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function BusRequestDetailModal({
  row,
  stops,
  onClose,
  onApprove,
  onReject,
  isPending,
}: {
  row: BusRequestRow;
  stops: Stop[];
  onClose: () => void;
  onApprove: () => void;
  onReject: (note?: string) => void;
  isPending: boolean;
}) {
  const { request, operator, user } = row;
  const [rejectNote, setRejectNote] = useState("");
  const stopMap = Object.fromEntries(stops.map((s) => [s.id, s.name]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
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
            Bus Request #{request.id.slice(0, 8)}
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-none border-2 border-[#0D1B2A]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section 1: Operator Details */}
        <h3
          className="text-xl font-extrabold uppercase tracking-wide"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
        >
          Operator Details
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <LabelValue label="Company Name" value={operator.companyName} />
          <LabelValue label="Contact Email" value={user.email ?? "-"} />
          <LabelValue label="Aadhar Number" value={request.operatorAadhaar ?? "-"} />
          <LabelValue label="Driving License" value={request.operatorLicense ?? "-"} />
          <LabelValue label="RC Number" value={request.rcNumber ?? "-"} />
          <LabelValue label="Pollution Certificate No." value={request.pollutionCertNumber ?? "-"} />
          <LabelValue label="Insurance Policy No." value={request.insurancePolicyNumber ?? "-"} />
          <LabelValue
            label="Approval Status"
            value={
              <StatusBadge status={operator.approved ? "approved" : "pending"} />
            }
          />
        </div>

        <div
          className="my-6 border-t-2 border-dashed"
          style={{ borderColor: "var(--border-medium)" }}
        />

        {/* Section 2: Bus Details */}
        <h3
          className="text-xl font-extrabold uppercase tracking-wide"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
        >
          Bus Application Details
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <LabelValue label="Bus Number" value={request.number} />
          <LabelValue label="License Plate" value={request.licensePlate} />
          <LabelValue
            label="Route"
            value={`${request.origin} \u2192 ${request.destination}`}
          />
          <LabelValue label="Full Fare" value={`\u20B9${request.fullFare}`} />
          <LabelValue label="Total Seats" value={String(request.totalSeats)} />
          <LabelValue label="Women Reserved Seats" value={String(request.womenReservedTotal)} />
          <LabelValue
            label="Student Card Accepted"
            value={
              request.studentCardAccepted
                ? `Yes (${request.studentDiscountPercent}% discount)`
                : "No"
            }
          />
          <LabelValue
            label="Submission Date"
            value={new Date(request.createdAt).toLocaleString("en-IN")}
          />
        </div>
        {request.schedule.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Schedule
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {request.schedule.map((t) => (
                <span
                  key={t}
                  className="rounded-none border px-2 py-1 text-xs font-semibold"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {request.routeStopIds.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Route Stops
            </p>
            <ol className="mt-1 list-decimal pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
              {request.routeStopIds.map((id, i) => (
                <li key={id}>
                  {stopMap[id] ?? id}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Actions (only if pending) */}
        {request.status === "pending" && (
          <div className="mt-6 flex flex-wrap gap-3 border-t-2 pt-4" style={{ borderColor: "var(--border-default)" }}>
            <div className="flex flex-1 flex-col gap-2">
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Rejection reason (optional)"
                rows={2}
                className="rounded-none border-2 px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              />
              <button
                onClick={() => onReject(rejectNote || undefined)}
                disabled={isPending}
                className={btnSecondary}
                style={{ boxShadow: "3px 3px 0 #0D1B2A" }}
              >
                Reject
              </button>
            </div>
            <button
              onClick={onApprove}
              disabled={isPending}
              className={btnPrimary}
              style={{ boxShadow: "3px 3px 0 #0D1B2A" }}
            >
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminAddBusModal({
  operators,
  stops,
  onClose,
  onSubmit,
  isPending,
}: {
  operators: OperatorRow[];
  stops: Stop[];
  onClose: () => void;
  onSubmit: (data: {
    number: string;
    operatorId: string;
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
  }) => void;
  isPending: boolean;
}) {
  const [number, setNumber] = useState("");
  const [operatorId, setOperatorId] = useState(operators[0]?.operator.id ?? "");
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

  const stopNames = stops.map((s) => s.name);

  const handleAddTime = () => {
    if (newTime.trim()) {
      setSchedule((s) => [...s, newTime.trim()]);
      setNewTime("");
    }
  };

  const handleRemoveTime = (i: number) => {
    setSchedule((s) => s.filter((_, idx) => idx !== i));
  };

  const toggleStop = (stopId: string) => {
    setRouteStopIds((ids) =>
      ids.includes(stopId) ? ids.filter((id) => id !== stopId) : [...ids, stopId]
    );
  };

  const moveStop = (idx: number, dir: "up" | "down") => {
    const next = [...routeStopIds];
    const j = dir === "up" ? idx - 1 : idx + 1;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setRouteStopIds(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fare = parseInt(fullFare, 10);
    const seats = parseInt(totalSeats, 10);
    const women = parseInt(womenReservedTotal, 10);
    const discount = parseInt(studentDiscountPercent, 10);
    if (
      !number ||
      !operatorId ||
      !licensePlate ||
      !origin ||
      !destination ||
      isNaN(fare) ||
      !driverName ||
      !conductorName ||
      isNaN(seats)
    ) {
      return;
    }
    onSubmit({
      number,
      operatorId,
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
    });
  };

  const inputClass =
    "h-11 w-full rounded-none border-2 px-3 text-sm outline-none";
  const inputStyle = {
    background: "var(--input-bg)",
    borderColor: "var(--input-border)",
    color: "var(--input-text)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
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
            Add Bus
          </h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-none border-2 border-[#0D1B2A]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Bus Number
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className={inputClass}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Assign to Operator
              </label>
              <select
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                {operators.map(({ operator }) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              License Plate
            </label>
            <input
              type="text"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              className={inputClass}
              style={inputStyle}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Origin
              </label>
              <input
                type="text"
                list="stop-names"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className={inputClass}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Destination
              </label>
              <input
                type="text"
                list="stop-names"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className={inputClass}
                style={inputStyle}
                required
              />
            </div>
          </div>
          <datalist id="stop-names">
            {stopNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Full Fare (&#8377;)
              </label>
              <input
                type="number"
                min={1}
                value={fullFare}
                onChange={(e) => setFullFare(e.target.value)}
                className={inputClass}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Total Seats
              </label>
              <input
                type="number"
                min={1}
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value)}
                className={inputClass}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Driver Name
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className={inputClass}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Conductor Name
              </label>
              <input
                type="text"
                value={conductorName}
                onChange={(e) => setConductorName(e.target.value)}
                className={inputClass}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Women Reserved Seats
              </label>
              <input
                type="number"
                min={0}
                value={womenReservedTotal}
                onChange={(e) => setWomenReservedTotal(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Student Card Accepted
              </label>
              <label className="flex h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={studentCardAccepted}
                  onChange={(e) => setStudentCardAccepted(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Yes
                </span>
              </label>
              {studentCardAccepted && (
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={studentDiscountPercent}
                  onChange={(e) => setStudentDiscountPercent(e.target.value)}
                  placeholder="Discount %"
                  className={`mt-2 ${inputClass}`}
                  style={inputStyle}
                />
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Schedule (HH:MM)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="HH:MM"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTime())}
                className={inputClass}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={handleAddTime}
                className="h-11 rounded-none border-2 border-[#0D1B2A] bg-[#0E7C86] px-4 text-sm font-bold text-white"
              >
                Add Time
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {schedule.map((t, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-none border-2 px-2 py-1 text-xs"
                  style={{ borderColor: "var(--border-default)" }}
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTime(i)}
                    className="text-red-600 hover:underline"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Route Stops (select and reorder)
            </label>
            <div className="flex flex-wrap gap-1">
              {stops.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStop(s.id)}
                  className={`rounded-none border-2 px-2 py-1 text-xs font-semibold ${
                    routeStopIds.includes(s.id)
                      ? "border-[#0D1B2A] bg-[#F4A522] text-[#0D1B2A]"
                      : "border-[var(--border-default)]"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className="mt-2 space-y-1">
              {routeStopIds.map((id, i) => {
                const s = stops.find((x) => x.id === id);
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-none border px-2 py-1"
                    style={{ borderColor: "var(--border-default)" }}
                  >
                    <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                      {i + 1}.
                    </span>
                    <span className="text-sm">{s?.name ?? id}</span>
                    <button
                      type="button"
                      onClick={() => moveStop(i, "up")}
                      disabled={i === 0}
                      className="ml-auto"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStop(i, "down")}
                      disabled={i === routeStopIds.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className={btnSecondary} style={{ boxShadow: "3px 3px 0 #0D1B2A" }}>
              Cancel
            </button>
            <button type="submit" disabled={isPending} className={btnPrimary} style={{ boxShadow: "3px 3px 0 #0D1B2A" }}>
              Add Bus
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LabelValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className="rounded-none border px-3 py-2"
      style={{ borderColor: "var(--border-default)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
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
      className="rounded-none border-2 p-5"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
        boxShadow: "4px 4px 0 #0D1B2A",
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
