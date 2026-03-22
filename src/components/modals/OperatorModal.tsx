"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Bus, Complaint, Operator } from "@/lib/db/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OperatorModalUser {
  name: string | null;
  email: string | null;
}

interface OperatorModalProps {
  open: boolean;
  onClose: () => void;
  operator: Operator;
  user: OperatorModalUser;
  buses: Bus[];
  complaints: Complaint[];
}

type ModalTab = "info" | "bus-info" | "edit";

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── CollapsibleDocRow ─────────────────────────────────────────────────────────

interface CollapsibleDocRowProps {
  label: string;
  value: string | null | undefined;
  mode: "view" | "edit";
  onChange?: (val: string) => void;
}

function CollapsibleDocRow({ label, value, mode, onChange }: CollapsibleDocRowProps) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const hasValue = Boolean(value?.trim());

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied!", { duration: 1500 });
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div
      className="border-2 border-foreground"
      style={{
        marginBottom: "-2px", // merge borders between rows
        background: "var(--bg-surface)",
      }}
    >
      {/* Header button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3
          hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <span
          className="text-xs font-black uppercase tracking-widest"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "var(--text-primary)",
          }}
        >
          {label}
        </span>
        <div className="flex items-center gap-3">
          <span
            className={`h-2 w-2 rounded-full border border-foreground ${
              hasValue ? "bg-emerald-500" : "bg-muted-foreground/30"
            }`}
          />
          <span
            className="text-[10px] font-bold transition-transform duration-200 inline-block"
            style={{
              color: "var(--text-muted)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {/* Expanded panel */}
      {open && (
        <div
          className="border-t-2 border-foreground px-4 py-3"
          style={{ background: "var(--bg-surface-2)" }}
        >
          {mode === "view" ? (
            <div className="flex items-center gap-2">
              <span
                className="flex-1 font-mono text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                {!hasValue ? (
                  <span style={{ color: "var(--text-muted)" }}>Not provided</span>
                ) : shown ? (
                  value
                ) : (
                  "•••• •••• ••••"
                )}
              </span>
              {hasValue && (
                <>
                  <button
                    type="button"
                    onClick={() => setShown((s) => !s)}
                    className="h-8 border-2 border-foreground px-3 text-[10px]
                      font-black uppercase tracking-wide
                      hover:bg-foreground hover:text-background transition-colors"
                  >
                    {shown ? "HIDE" : "SHOW"}
                  </button>
                  <button
                    type="button"
                    onClick={copy}
                    className="h-8 border-2 border-foreground px-3 text-[10px]
                      font-black uppercase tracking-wide
                      hover:bg-[#F4A522] hover:text-[#0D1B2A] transition-colors"
                  >
                    COPY
                  </button>
                </>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={value ?? ""}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}…`}
              className="h-10 w-full border-2 border-foreground px-3
                text-sm outline-none rounded-none"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-text)",
                borderColor: "var(--input-border)",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export function OperatorModal({
  open,
  onClose,
  operator,
  user,
  buses,
  complaints,
}: OperatorModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>("info");
  const [isPending, startTransition] = useTransition();

  // Edit form state
  const [companyName, setCompanyName] = useState(operator.companyName);
  const [phone, setPhone] = useState(operator.phone ?? "");
  const [docForm, setDocForm] = useState({
    aadhar:            (operator as any).aadhar            ?? "",
    drivingLicense:    (operator as any).drivingLicense     ?? "",
    rcNumber:          (operator as any).rcNumber           ?? "",
    pollutionCertNo:   (operator as any).pollutionCertNo    ?? "",
    insurancePolicyNo: (operator as any).insurancePolicyNo  ?? "",
  });

  // Danger zone state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Bus detail drill-down
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const selectedBus = buses.find((b) => b.id === selectedBusId) ?? null;

  if (!open) return null;

  // ── Derived stats ──
  const opBusIds = new Set(buses.map((b) => b.id));
  const opComplaints = complaints.filter((c) => opBusIds.has(c.busId));
  const warnings = opComplaints.filter((c) => c.status === "pending").length;

  const uniqueStopIds = new Set<string>();
  // (stop count would need route data; show bus count as proxy for now)
  const locationsCount = buses.reduce((acc, b) => acc + ((b as any).routeStopIds?.length ?? 0), 0);

  let ratingsScore = "—";
  const totalVotes = buses.reduce(
    (acc, b) => {
      const v = b.votes as { onTime: number; slightlyLate: number; veryLate: number };
      return {
        onTime:      acc.onTime      + (v?.onTime      ?? 0),
        slightlyLate: acc.slightlyLate + (v?.slightlyLate ?? 0),
        veryLate:    acc.veryLate    + (v?.veryLate    ?? 0),
      };
    },
    { onTime: 0, slightlyLate: 0, veryLate: 0 }
  );
  const n = totalVotes.onTime + totalVotes.slightlyLate + totalVotes.veryLate;
  if (n > 0) {
    const score =
      (totalVotes.onTime * 5 + totalVotes.slightlyLate * 3 + totalVotes.veryLate * 1) / n;
    ratingsScore = score.toFixed(1);
  }

  // ── Handlers ──

  const handleSave = () => {
    startTransition(async () => {
      const { updateOperatorAction } = await import("@/lib/actions/bus");
      const result = await updateOperatorAction(operator.id, {
        companyName: companyName.trim() || undefined,
        phone: phone.trim(),
        aadhar:            docForm.aadhar            || undefined,
        drivingLicense:    docForm.drivingLicense     || undefined,
        rcNumber:          docForm.rcNumber           || undefined,
        pollutionCertNo:   docForm.pollutionCertNo    || undefined,
        insurancePolicyNo: docForm.insurancePolicyNo  || undefined,
      });
      if (result.success) {
        toast.success("Operator updated");
        onClose();
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const { deleteOperatorAction } = await import("@/lib/actions/bus");
      const result = await deleteOperatorAction(operator.id);
      if (result.success) {
        toast.success("Operator deleted");
        onClose();
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  };

  const DOC_FIELDS = [
    { label: "Aadhar Number",        key: "aadhar"            as const },
    { label: "Driving License",      key: "drivingLicense"    as const },
    { label: "RC Number",            key: "rcNumber"          as const },
    { label: "Pollution Cert No.",   key: "pollutionCertNo"   as const },
    { label: "Insurance Policy No.", key: "insurancePolicyNo" as const },
  ];

  // ── Tab content ──

  const InfoPanel = (
    <div className="space-y-4">
      {/* Identity block */}
      <div
        className="flex items-start gap-4 p-4 border-2 border-foreground"
        style={{ background: "var(--bg-surface-2)" }}
      >
        {/* Avatar */}
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center
            border-3 border-foreground bg-[#0D1B2A] text-white text-xl font-black
            shadow-[4px_4px_0_hsl(var(--shadow-color))]"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          {initials(operator.companyName)}
        </div>

        {/* Info */}
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}>Name</p>
          <p className="text-lg font-extrabold uppercase leading-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif",
                     color: "var(--text-primary)" }}>
            {operator.companyName}
          </p>

          <p className="text-[10px] font-bold uppercase tracking-widest mt-2"
            style={{ color: "var(--text-muted)" }}>Email ID</p>
          <p className="text-sm font-semibold"
            style={{ color: "var(--text-secondary)" }}>
            {user.email ?? "—"}
          </p>

          <p className="text-[10px] font-bold uppercase tracking-widest mt-1"
            style={{ color: "var(--text-muted)" }}>Phone Number</p>
          <p className="text-sm font-semibold"
            style={{ color: "var(--text-secondary)" }}>
            {operator.phone?.trim() || "—"}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-0">
        {[
          { label: "Total Buses",        value: buses.length },
          { label: "Locations Covering", value: locationsCount },
          { label: "Fines",              value: 0 },
          { label: "Complaints",         value: opComplaints.length },
          { label: "Warnings",           value: warnings },
          { label: "Ratings",            value: ratingsScore },
        ].map(({ label, value }, i) => (
          <div
            key={label}
            className="border-2 border-foreground p-3 text-center"
            style={{ marginRight: i % 3 !== 2 ? "-2px" : 0,
                     marginBottom: i < 3 ? "-2px" : 0 }}
          >
            <p className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-2xl font-black"
              style={{ fontFamily: "'Barlow Condensed', sans-serif",
                       color: "var(--text-primary)" }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Document fields — collapsible, view mode */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1"
          style={{ color: "var(--text-muted)" }}>
          Operator Documents
        </p>
        <p className="text-[10px] mb-2"
          style={{ color: "var(--text-muted)" }}>
          Click any field to expand
        </p>
        <div>
          {DOC_FIELDS.map(({ label, key }) => (
            <CollapsibleDocRow
              key={key}
              label={label}
              value={(operator as any)[key] ?? null}
              mode="view"
            />
          ))}
          {/* Final border bottom */}
          <div className="border-b-2 border-foreground" />
        </div>
      </div>
    </div>
  );

  const BusInfoPanel = (
    <div>
      {selectedBus ? (
        /* Bus detail drill-down */
        <div>
          <button
            type="button"
            onClick={() => setSelectedBusId(null)}
            className="mb-4 flex items-center gap-1 text-xs font-bold uppercase
              tracking-wide hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            ← Back to buses
          </button>

          <div className="space-y-2">
            {[
              ["Bus Number",    selectedBus.number],
              ["License Plate", selectedBus.licensePlate],
              ["Route",         `${selectedBus.origin} → ${selectedBus.destination}`],
              ["Full Fare",     `₹${selectedBus.fullFare}`],
              ["Driver",        selectedBus.driverName],
              ["Conductor",     selectedBus.conductorName],
              ["Total Seats",   String(selectedBus.totalSeats)],
              ["Status",        selectedBus.status],
            ].map(([k, v]) => (
              <div key={k}
                className="flex items-center border-2 border-foreground px-4 py-2"
                style={{ background: "var(--bg-surface)" }}>
                <p className="w-36 text-[10px] font-bold uppercase tracking-widest shrink-0"
                  style={{ color: "var(--text-muted)" }}>{k}</p>
                <p className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}>{v}</p>
              </div>
            ))}

            {/* Schedule */}
            <div className="border-2 border-foreground px-4 py-2"
              style={{ background: "var(--bg-surface)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--text-muted)" }}>Schedule</p>
              <div className="flex flex-wrap gap-2">
                {(selectedBus.schedule as string[]).map((t) => (
                  <span key={t}
                    className="border-2 border-foreground px-2 py-0.5 text-xs font-bold"
                    style={{ background: "var(--bg-surface-2)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Bus list */
        <div>
          {buses.length === 0 ? (
            <p className="py-8 text-center text-sm"
              style={{ color: "var(--text-muted)" }}>
              No buses registered yet.
            </p>
          ) : (
            <div>
              {buses.map((bus) => (
                <div
                  key={bus.id}
                  className="flex items-center justify-between border-2 border-foreground
                    px-4 py-3"
                  style={{
                    marginBottom: "-2px",
                    background: "var(--bg-surface)",
                  }}
                >
                  {/* License plate — large */}
                  <span
                    className="text-xl font-extrabold uppercase tracking-wide"
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      color: "var(--text-primary)",
                    }}
                  >
                    {bus.licensePlate}
                  </span>

                  {/* Status badge */}
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    style={
                      bus.status === "Running"
                        ? { background: "var(--status-running-bg)",
                            color: "var(--status-running-text)",
                            borderColor: "var(--status-running-border)" }
                        : bus.status === "Delayed"
                        ? { background: "var(--status-delayed-bg)",
                            color: "var(--status-delayed-text)",
                            borderColor: "var(--status-delayed-border)" }
                        : { background: "var(--status-stopped-bg)",
                            color: "var(--status-stopped-text)",
                            borderColor: "var(--status-stopped-border)" }
                    }
                  >
                    {bus.status}
                  </span>

                  {/* View button — small */}
                  <button
                    type="button"
                    onClick={() => setSelectedBusId(bus.id)}
                    className="h-8 border-2 border-foreground px-3 text-xs font-bold
                      uppercase tracking-wide hover:bg-foreground hover:text-background
                      transition-colors"
                  >
                    VIEW →
                  </button>
                </div>
              ))}
              {/* Close the border at the bottom */}
              <div className="border-b-2 border-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const EditPanel = (
    <div className="space-y-4">
      {/* Edit form card */}
      <div
        className="border-2 border-foreground p-4"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "4px 4px 0 hsl(var(--shadow-color))",
        }}
      >
        <p
          className="text-xl font-black uppercase mb-1"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "var(--text-primary)",
          }}
        >
          Edit Operator
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Update company details and document references
        </p>

        <div className="space-y-3">
          {/* Name */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wide mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="h-11 w-full border-2 border-foreground px-3 text-sm
                outline-none rounded-none"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-text)",
                borderColor: "var(--input-border)",
              }}
            />
          </div>

          {/* Email — read only */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wide mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              Email ID
            </label>
            <input
              type="email"
              value={user.email ?? ""}
              readOnly
              disabled
              className="h-11 w-full border-2 px-3 text-sm outline-none rounded-none
                opacity-50 cursor-not-allowed"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-text)",
                borderColor: "var(--input-border)",
              }}
            />
          </div>

          {/* Phone */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wide mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              Phone No
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 w-full border-2 border-foreground px-3 text-sm
                outline-none rounded-none"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-text)",
                borderColor: "var(--input-border)",
              }}
            />
          </div>

          {/* Document fields — collapsible, edit mode */}
          <div className="pt-2">
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              Operator Documents
            </p>
            <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>
              Click any field to expand and edit
            </p>
            <div>
              {DOC_FIELDS.map(({ label, key }) => (
                <CollapsibleDocRow
                  key={key}
                  label={label}
                  value={docForm[key]}
                  mode="edit"
                  onChange={(val) =>
                    setDocForm((prev) => ({ ...prev, [key]: val }))
                  }
                />
              ))}
              <div className="border-b-2 border-foreground" />
            </div>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="h-11 w-full border-2 border-foreground font-black uppercase
              tracking-wide text-sm transition-all disabled:opacity-60
              hover:translate-x-[2px] hover:translate-y-[2px]"
            style={{
              background: "#F4A522",
              color: "#0D1B2A",
              boxShadow: "3px 3px 0 #0D1B2A",
            }}
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Danger Zone — separate card ── */}
      <div
        className="border-2 border-destructive mt-2"
        style={{ background: "var(--bg-surface)" }}
      >
        {/* Danger zone header */}
        <div className="border-b-2 border-destructive px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p
              className="font-black uppercase tracking-wide text-destructive"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Danger Zone
            </p>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Irreversible and destructive actions
          </p>
        </div>

        {/* Delete row */}
        <div
          className="flex items-center justify-between p-4"
          style={{ background: "hsl(var(--destructive) / 0.05)" }}
        >
          <div className="min-w-0 pr-4">
            <p className="font-bold text-sm text-destructive">
              Delete Operator Account
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Permanently removes the operator, their account, and
              dissociates their buses. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="shrink-0 flex items-center gap-1.5 h-9 border-2
              border-red-800 bg-destructive px-3 text-xs font-bold uppercase
              text-white hover:opacity-80 transition-opacity"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>

        {/* Confirmation — only shown after clicking Delete */}
        {showDeleteConfirm && (
          <div
            className="border-t-2 border-destructive p-4 space-y-3"
            style={{ background: "hsl(var(--destructive) / 0.05)" }}
          >
            <label
              className="block text-[10px] font-bold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Type the company name to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={operator.companyName}
              className="h-10 w-full border-2 border-foreground px-3 text-sm
                outline-none rounded-none"
              style={{
                background: "var(--input-bg)",
                color: "var(--input-text)",
                borderColor: "var(--input-border)",
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirm("");
                }}
                className="flex-1 h-9 border-2 border-foreground text-xs
                  font-bold uppercase hover:bg-muted transition-colors"
                style={{ color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteConfirm !== operator.companyName || isPending}
                className="flex-1 h-9 border-2 border-red-800 bg-destructive
                  text-xs font-bold uppercase text-white
                  disabled:opacity-40 hover:opacity-80 transition-opacity
                  flex items-center justify-center gap-1.5"
                style={{ boxShadow: "3px 3px 0 rgb(153,27,27)" }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Confirm Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ──

  return (
    <>
      {/* Backdrop — no click-to-close */}
      <div className="fixed inset-0 z-40 bg-black/60" />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-2xl
          -translate-x-1/2 -translate-y-1/2 flex-col border-2 border-foreground
          overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          maxHeight: "90vh",
          boxShadow: "6px 6px 0 hsl(var(--shadow-color))",
        }}
      >
        {/* ── Layer 1: Header — never scrolls ── */}
        <div
          className="flex shrink-0 items-center justify-between border-b-2
            border-foreground px-4 py-3"
        >
          <p
            className="text-xl font-black uppercase tracking-wide"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--text-primary)",
            }}
          >
            {operator.companyName}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border-2
              border-foreground font-black text-sm hover:bg-foreground
              hover:text-background transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Layer 2: Tab bar — never scrolls ── */}
        <div className="flex shrink-0 border-b-2 border-foreground">
          {(
            [
              { id: "info",     label: "INFO"     },
              { id: "bus-info", label: "BUS INFO" },
              { id: "edit",     label: "EDIT"     },
            ] as const
          ).map(({ id, label }, i, arr) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                setSelectedBusId(null); // reset bus drill-down on tab switch
              }}
              className="flex-1 h-10 text-xs font-black uppercase tracking-widest
                transition-colors"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                background: activeTab === id ? "var(--text-primary)" : "var(--bg-surface)",
                color: activeTab === id ? "var(--bg-surface)" : "var(--text-primary)",
                borderRight: i < arr.length - 1 ? "2px solid var(--border-default)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Layer 3: Scrollable content ── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--text-primary) transparent" }}
        >
          <div className="p-4">
            {activeTab === "info"     && InfoPanel}
            {activeTab === "bus-info" && BusInfoPanel}
            {activeTab === "edit"     && EditPanel}
          </div>
        </div>
      </div>
    </>
  );
}