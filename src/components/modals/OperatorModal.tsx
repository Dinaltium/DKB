"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { BusWithRouteIds } from "@/lib/db/queries";
import type { Complaint, Operator, Payment } from "@/lib/db/schema";
import {
  deleteOperatorAction,
  updateBusDetailsAction,
  updateOperatorAction,
} from "@/lib/actions/bus";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OperatorModalUser {
  name: string | null;
  email: string | null;
  createdAt: Date;
  mustChangePassword: boolean;
}

export interface OperatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: Operator;
  user: OperatorModalUser;
  buses: BusWithRouteIds[];
  complaints: Complaint[];
  payments: Payment[];
  mode: "admin" | "view";
}

type ModalTab = "info" | "bus-info" | "edit";
type BusSubTab = "info" | "edit";
type DocFieldKey =
  | "aadhar"
  | "drivingLicense"
  | "rcNumber"
  | "pollutionCertNo"
  | "insurancePolicyNo";

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_FIELDS: { key: DocFieldKey; label: string; placeholder: string }[] = [
  { key: "aadhar", label: "Aadhar Number", placeholder: "XXXX XXXX XXXX" },
  {
    key: "drivingLicense",
    label: "Driving License",
    placeholder: "DL-XXXX-XXXXXXX",
  },
  { key: "rcNumber", label: "RC Number", placeholder: "KA-XX-XXXX-XXXXXX" },
  {
    key: "pollutionCertNo",
    label: "Pollution Cert No.",
    placeholder: "PUC/XXXX/XX",
  },
  {
    key: "insurancePolicyNo",
    label: "Insurance Policy No.",
    placeholder: "Policy number",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function operatorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "OP";
}

function pooledRating(buses: BusWithRouteIds[]): string {
  let on = 0,
    late = 0,
    very = 0;
  for (const b of buses) {
    on += b.votes.onTime;
    late += b.votes.slightlyLate;
    very += b.votes.veryLate;
  }
  const n = on + late + very;
  if (n === 0) return "—";
  return ((on * 5 + late * 3 + very) / n).toFixed(1);
}

function docValue(op: Operator, key: DocFieldKey): string | null {
  switch (key) {
    case "aadhar":
      return op.aadhar ?? null;
    case "drivingLicense":
      return op.drivingLicense ?? null;
    case "rcNumber":
      return op.rcNumber ?? null;
    case "pollutionCertNo":
      return op.pollutionCertNo ?? null;
    case "insurancePolicyNo":
      return op.insurancePolicyNo ?? null;
  }
}

// ── Tab button shared style ───────────────────────────────────────────────────
// ToggleGroupItem uses data-[state=on] for active, data-[state=off] for inactive.

const TAB_ITEM_CLASS = [
  "h-10 rounded-none border-2 border-foreground px-6",
  "text-xs font-black uppercase tracking-widest",
  "shadow-[4px_4px_0_hsl(var(--shadow-color))]",
  "transition-all duration-200",
  "hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none",
  "data-[state=on]:bg-foreground data-[state=on]:text-background",
  "data-[state=on]:translate-x-[4px] data-[state=on]:translate-y-[4px] data-[state=on]:shadow-none",
  "data-[state=off]:bg-background data-[state=off]:text-foreground",
].join(" ");

// ── Main Modal ────────────────────────────────────────────────────────────────

export function OperatorModal({
  open,
  onOpenChange,
  operator,
  user,
  buses,
  complaints,
  payments,
  mode,
}: OperatorModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Tab state — driven by ToggleGroup, content rendered conditionally
  const [tab, setTab] = useState<ModalTab>("info");

  // Bus drill-down
  const [busPanelId, setBusPanelId] = useState<string | null>(null);
  const [busSubTab, setBusSubTab] = useState<BusSubTab>("info");

  // Edit form
  const [companyName, setCompanyName] = useState(operator.companyName);
  const [phone, setPhone] = useState(operator.phone ?? "");
  const [docForm, setDocForm] = useState<Record<DocFieldKey, string>>({
    aadhar: operator.aadhar ?? "",
    drivingLicense: operator.drivingLicense ?? "",
    rcNumber: operator.rcNumber ?? "",
    pollutionCertNo: operator.pollutionCertNo ?? "",
    insurancePolicyNo: operator.insurancePolicyNo ?? "",
  });

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Doc field show/hide (per-field independent)
  const [shownFields, setShownFields] = useState<Set<DocFieldKey>>(
    () => new Set(),
  );

  // Reset everything when the modal opens or the operator changes
  useEffect(() => {
    if (!open) return;
    setTab("info");
    setBusPanelId(null);
    setBusSubTab("info");
    setCompanyName(operator.companyName);
    setPhone(operator.phone ?? "");
    setDocForm({
      aadhar: operator.aadhar ?? "",
      drivingLicense: operator.drivingLicense ?? "",
      rcNumber: operator.rcNumber ?? "",
      pollutionCertNo: operator.pollutionCertNo ?? "",
      insurancePolicyNo: operator.insurancePolicyNo ?? "",
    });
    setDeleteConfirm("");
    setShowDeleteConfirm(false);
    setShownFields(new Set());
  }, [
    open,
    operator.id,
    operator.companyName,
    operator.phone,
    operator.aadhar,
    operator.drivingLicense,
    operator.rcNumber,
    operator.pollutionCertNo,
    operator.insurancePolicyNo,
  ]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const busIds = useMemo(() => new Set(buses.map((b) => b.id)), [buses]);

  const opComplaints = useMemo(
    () => complaints.filter((c) => busIds.has(c.busId)),
    [complaints, busIds],
  );

  const warningsCount = useMemo(
    () => opComplaints.filter((c) => c.status === "pending").length,
    [opComplaints],
  );

  const finesTotal = useMemo(() => {
    let sum = 0;
    for (const p of payments) {
      if (p.status === "failed" && busIds.has(p.busId)) sum += p.amount;
    }
    return sum;
  }, [payments, busIds]);

  const locationsCount = useMemo(() => {
    const s = new Set<string>();
    for (const b of buses) {
      for (const id of b.routeStopIds ?? []) s.add(id);
    }
    return s.size;
  }, [buses]);

  const selectedBus = buses.find((b) => b.id === busPanelId) ?? null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const copyToClipboard = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied!", { duration: 1500 });
    } catch {
      toast.error("Copy failed");
    }
  }, []);

  const toggleFieldShow = useCallback((key: DocFieldKey) => {
    setShownFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      const r = await updateOperatorAction(operator.id, {
        companyName: companyName.trim() || undefined,
        phone: phone.trim(),
        aadhar: docForm.aadhar || undefined,
        drivingLicense: docForm.drivingLicense || undefined,
        rcNumber: docForm.rcNumber || undefined,
        pollutionCertNo: docForm.pollutionCertNo || undefined,
        insurancePolicyNo: docForm.insurancePolicyNo || undefined,
      });
      if (r.success) {
        toast.success("Operator updated");
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const r = await deleteOperatorAction(operator.id);
      if (r.success) {
        toast.success("Operator removed");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  };

  const handleTabChange = (value: string) => {
    if (!value) return; // ToggleGroup fires empty string on deselect — ignore
    setTab(value as ModalTab);
    setBusPanelId(null);
    setBusSubTab("info");
  };

  if (!open) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop — no click-to-close */}
      <div className="fixed inset-0 z-40 bg-black/60" />

      {/* Modal container — 3-layer flex column */}
      <div
        className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-2xl
          -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden
          border-2 border-foreground"
        style={{
          background: "var(--bg-surface)",
          maxHeight: "90vh",
          boxShadow: "6px 6px 0 hsl(var(--shadow-color))",
        }}
      >
        {/* ── Layer 1: Header — shrink-0, never scrolls ── */}
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
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center border-2
              border-foreground font-black text-sm hover:bg-foreground
              hover:text-background transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Layer 2: Tab bar — shrink-0, never scrolls ── */}
        {/*
          KEY: ToggleGroup is the ONLY thing controlling tab state.
          Content is rendered conditionally below based on `tab` state.
          No Tabs/TabsList/TabsContent anywhere — those were the bug.
        */}
        <div className="shrink-0 border-b-2 border-foreground px-3 py-2">
          <ToggleGroup
            type="single"
            value={tab}
            onValueChange={handleTabChange}
            className="flex w-full gap-2 rounded-none bg-transparent p-0"
          >
            <ToggleGroupItem
              value="info"
              className={TAB_ITEM_CLASS}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              INFO
            </ToggleGroupItem>
            <ToggleGroupItem
              value="bus-info"
              className={TAB_ITEM_CLASS}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              BUS INFO
            </ToggleGroupItem>
            {mode === "admin" && (
              <ToggleGroupItem
                value="edit"
                className={TAB_ITEM_CLASS}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                EDIT
              </ToggleGroupItem>
            )}
          </ToggleGroup>
        </div>

        {/* ── Layer 3: Content — flex-1 min-h-0 overflow-y-auto = scrolls ── */}
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "var(--text-primary) transparent",
          }}
        >
          {/* ── INFO tab ── */}
          {tab === "info" && (
            <div>
              {/* Identity block */}
              <div
                className="flex items-start gap-5 border-b-2 border-foreground p-5"
                style={{ background: "var(--bg-surface-2)" }}
              >
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center
                    border-3 border-foreground bg-primary text-2xl font-black
                    text-primary-foreground shadow-[4px_4px_0_hsl(var(--shadow-color))]"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {operatorInitials(operator.companyName)}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Name
                  </p>
                  <p
                    className="text-xl font-extrabold uppercase"
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      color: "var(--text-primary)",
                    }}
                  >
                    {operator.companyName}
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Email ID
                  </p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {user.email ?? "—"}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Phone Number
                  </p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {operator.phone?.trim() || "—"}
                  </p>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Stats grid */}
                <div className="grid grid-cols-3">
                  {(
                    [
                      ["Total Buses", String(buses.length)],
                      ["Locations Covering", String(locationsCount)],
                      ["Fines", String(finesTotal)],
                      ["Complaints", String(opComplaints.length)],
                      ["Warnings", String(warningsCount)],
                      ["Ratings", pooledRating(buses)],
                    ] as const
                  ).map(([label, value], i) => (
                    <div
                      key={label}
                      className="border-2 border-foreground p-3 text-center"
                      style={{
                        marginRight: i % 3 !== 2 ? "-2px" : 0,
                        marginBottom: i < 3 ? "-2px" : 0,
                      }}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        {label}
                      </p>
                      <p
                        className="text-2xl font-black"
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          color: "var(--text-primary)",
                        }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Document fields — collapsible rows */}
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Operator Documents
                  </p>
                  <p className="mb-2 text-[10px] text-muted-foreground">
                    Click Show to reveal a field
                  </p>
                  <div>
                    {DOC_FIELDS.map(({ key, label }) => {
                      const value = docValue(operator, key);
                      const isShown = shownFields.has(key);
                      const hasValue = Boolean(value?.trim());
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between border-2
                            border-foreground px-4 py-3"
                          style={{
                            marginBottom: "-2px",
                            background: "var(--bg-surface)",
                          }}
                        >
                          {/* Label */}
                          <p
                            className="w-40 shrink-0 text-xs font-black uppercase tracking-widest"
                            style={{
                              fontFamily: "'Barlow Condensed', sans-serif",
                              color: "var(--text-primary)",
                            }}
                          >
                            {label}
                          </p>
                          {/* Value */}
                          <p
                            className="flex-1 text-center font-mono text-sm"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {!hasValue ? (
                              <span className="text-muted-foreground">
                                Not provided
                              </span>
                            ) : isShown ? (
                              value
                            ) : (
                              "•••• •••• ••••"
                            )}
                          </p>
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {hasValue && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(value!)}
                                className="h-7 border-2 border-foreground px-2 text-[10px]
                                  font-black uppercase hover:bg-[#F4A522] hover:text-[#0D1B2A]
                                  transition-colors"
                              >
                                COPY
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleFieldShow(key)}
                              className="h-7 border-2 border-foreground px-2 text-[10px]
                                font-black uppercase hover:bg-foreground hover:text-background
                                transition-colors"
                            >
                              {isShown ? "HIDE" : "SHOW"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="border-b-2 border-foreground" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── BUS INFO tab ── */}
          {tab === "bus-info" && (
            <div className="p-4">
              {busPanelId !== null && selectedBus !== null ? (
                <BusDetailPanel
                  key={selectedBus.id}
                  bus={selectedBus}
                  mode={mode}
                  busSubTab={busSubTab}
                  setBusSubTab={setBusSubTab}
                  onBack={() => {
                    setBusPanelId(null);
                    setBusSubTab("info");
                  }}
                  onSaved={() => {
                    toast.success("Bus updated");
                    router.refresh();
                  }}
                />
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="pr-3">
                    {buses.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No buses registered yet.
                      </p>
                    ) : (
                      <div>
                        {buses.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between border-2
                              border-foreground px-4 py-3"
                            style={{
                              marginBottom: "-2px",
                              background: "var(--bg-surface)",
                            }}
                          >
                            <span
                              className="text-xl font-extrabold uppercase tracking-wide"
                              style={{
                                fontFamily: "'Barlow Condensed', sans-serif",
                                color: "var(--text-primary)",
                              }}
                            >
                              {b.licensePlate}
                            </span>
                            <StatusBadge status={b.status} />
                            <button
                              type="button"
                              onClick={() => {
                                setBusPanelId(b.id);
                                setBusSubTab("info");
                              }}
                              className="h-8 border-2 border-foreground px-3 text-xs font-bold
                                uppercase tracking-wide hover:bg-foreground
                                hover:text-background transition-colors"
                            >
                              VIEW →
                            </button>
                          </div>
                        ))}
                        <div className="border-b-2 border-foreground" />
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* ── EDIT tab (admin only) ── */}
          {tab === "edit" && mode === "admin" && (
            <div className="space-y-4 p-4">
              {/* Edit form card */}
              <Card className="rounded-none border-3 border-foreground shadow-[4px_4px_0_hsl(var(--shadow-color))]">
                <CardHeader className="border-b-3 border-foreground">
                  <CardTitle
                    className="font-black uppercase"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    Edit Operator
                  </CardTitle>
                  <CardDescription>
                    Update company details and document references
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-6">
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Name
                    </Label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="mt-1 rounded-none border-2 border-foreground"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Email ID
                    </Label>
                    <Input
                      value={user.email ?? ""}
                      readOnly
                      disabled
                      className="mt-1 rounded-none border-2 border-foreground opacity-70"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Phone No
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 rounded-none border-2 border-foreground"
                    />
                  </div>
                  <div className="mt-2 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Operator Documents
                    </p>
                    {DOC_FIELDS.map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {label}
                        </Label>
                        <Input
                          value={docForm[key]}
                          onChange={(e) =>
                            setDocForm((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={placeholder}
                          className="mt-1 rounded-none border-2 border-foreground"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={handleSave}
                      className="rounded-none border-2 border-foreground font-bold
                        uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
                    >
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone — separate card */}
              <Card className="rounded-none border-2 border-destructive">
                <CardHeader className="border-b-2 border-destructive/50">
                  <CardTitle
                    className="flex items-center gap-2 font-black uppercase text-destructive"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div
                    className="flex items-center justify-between border-2
                      border-destructive/50 p-4"
                    style={{ background: "hsl(var(--destructive) / 0.05)" }}
                  >
                    <div className="min-w-0 pr-4">
                      <p className="font-bold text-destructive text-sm">
                        Delete Operator Account
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Permanently removes the operator, their account, and
                        dissociates their buses. This cannot be undone.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="shrink-0 rounded-none border-2 border-foreground"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>

                  {showDeleteConfirm && (
                    <div
                      className="space-y-3 border-2 border-destructive p-4"
                      style={{ background: "hsl(var(--destructive) / 0.05)" }}
                    >
                      <Label
                        className="block text-[10px] font-bold uppercase
                        tracking-wide text-muted-foreground"
                      >
                        Type the company name to confirm:
                      </Label>
                      <Input
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder={operator.companyName}
                        className="rounded-none border-2 border-foreground"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirm("");
                          }}
                          className="flex-1 rounded-none border-2 border-foreground"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={
                            deleteConfirm !== operator.companyName || isPending
                          }
                          onClick={handleDelete}
                          className="flex-1 rounded-none border-2 border-foreground
                            shadow-[3px_3px_0_hsl(var(--destructive))]"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Confirm Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── BusDetailPanel ────────────────────────────────────────────────────────────

const BUS_SUB_TAB_CLASS = [
  "h-9 rounded-none border-2 border-foreground px-4",
  "text-xs font-bold uppercase tracking-wide",
  "shadow-[4px_4px_0_hsl(var(--shadow-color))]",
  "transition-all duration-200",
  "hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none",
  "data-[state=on]:bg-foreground data-[state=on]:text-background",
  "data-[state=on]:translate-x-[4px] data-[state=on]:translate-y-[4px] data-[state=on]:shadow-none",
  "data-[state=off]:bg-background data-[state=off]:text-foreground",
].join(" ");

function BusDetailPanel({
  bus,
  mode,
  busSubTab,
  setBusSubTab,
  onBack,
  onSaved,
}: {
  bus: BusWithRouteIds;
  mode: "admin" | "view";
  busSubTab: BusSubTab;
  setBusSubTab: (t: BusSubTab) => void;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [st, setSt] = useState(bus.status);
  const [note, setNote] = useState(bus.statusNote);
  const [driver, setDriver] = useState(bus.driverName);
  const [conductor, setConductor] = useState(bus.conductorName);
  const [occ, setOcc] = useState(String(bus.occupiedSeats));
  const [women, setWomen] = useState(String(bus.womenReservedAvailable));
  const [savePending, startSave] = useTransition();

  const handleSubTabChange = (value: string) => {
    if (!value) return;
    setBusSubTab(value as BusSubTab);
  };

  return (
    <div className="space-y-3">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-xs font-bold uppercase
          tracking-wide hover:opacity-70"
        style={{ color: "var(--text-muted)" }}
      >
        ← Back to buses
      </button>

      {/* Sub-tab bar — also ToggleGroup, same pattern */}
      <div>
        <ToggleGroup
          type="single"
          value={busSubTab}
          onValueChange={handleSubTabChange}
          className="flex w-full gap-2 rounded-none bg-transparent p-0"
        >
          <ToggleGroupItem
            value="info"
            className={BUS_SUB_TAB_CLASS}
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            INFO
          </ToggleGroupItem>
          {mode === "admin" && (
            <ToggleGroupItem
              value="edit"
              className={BUS_SUB_TAB_CLASS}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              EDIT
            </ToggleGroupItem>
          )}
        </ToggleGroup>
      </div>

      {/* Sub-tab content — conditional rendering, no Tabs */}
      {busSubTab === "info" && (
        <div className="space-y-2 mt-2">
          {(
            [
              ["Bus Number", bus.number],
              ["License Plate", bus.licensePlate],
              ["Route", `${bus.origin} → ${bus.destination}`],
              ["Full Fare", `₹${bus.fullFare}`],
              ["Driver", bus.driverName],
              ["Conductor", bus.conductorName],
              ["Total Seats", String(bus.totalSeats)],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div
              key={k}
              className="border-2 border-foreground px-4 py-2"
              style={{ background: "var(--bg-surface)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {k}
              </p>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {v}
              </p>
            </div>
          ))}
          <div
            className="border-2 border-foreground px-4 py-2"
            style={{ background: "var(--bg-surface)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Status
            </p>
            <StatusBadge status={bus.status} />
          </div>
          <div
            className="border-2 border-foreground px-4 py-2"
            style={{ background: "var(--bg-surface)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Schedule
            </p>
            <div className="flex flex-wrap gap-1">
              {bus.schedule.map((t) => (
                <span
                  key={t}
                  className="border-2 border-foreground px-2 py-0.5 text-xs font-bold"
                  style={{ background: "var(--bg-surface-2)" }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {busSubTab === "edit" && mode === "admin" && (
        <div className="space-y-3 mt-2">
          <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Status
            <select
              value={st}
              onChange={(e) => setSt(e.target.value as typeof bus.status)}
              className="mt-1 h-10 w-full rounded-none border-2 border-foreground
                bg-background px-2 text-sm"
            >
              <option>Running</option>
              <option>Not Running</option>
              <option>Delayed</option>
            </select>
          </label>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Status Note
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 rounded-none border-2 border-foreground"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Driver Name
            </Label>
            <Input
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              className="mt-1 rounded-none border-2 border-foreground"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Conductor Name
            </Label>
            <Input
              value={conductor}
              onChange={(e) => setConductor(e.target.value)}
              className="mt-1 rounded-none border-2 border-foreground"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Occupied Seats
            </Label>
            <Input
              type="number"
              value={occ}
              onChange={(e) => setOcc(e.target.value)}
              className="mt-1 rounded-none border-2 border-foreground"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Women Reserved Available
            </Label>
            <Input
              type="number"
              value={women}
              onChange={(e) => setWomen(e.target.value)}
              className="mt-1 rounded-none border-2 border-foreground"
            />
          </div>
          <Button
            type="button"
            disabled={savePending}
            onClick={() =>
              startSave(async () => {
                const r = await updateBusDetailsAction(bus.id, {
                  status: st,
                  statusNote: note,
                  driverName: driver,
                  conductorName: conductor,
                  occupiedSeats: Number(occ),
                  womenReservedAvailable: Number(women),
                });
                if (r.success) onSaved();
                else toast.error(r.error ?? "Failed");
              })
            }
            className="w-full rounded-none border-2 border-foreground font-bold
              uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
