"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { BusWithRouteIds } from "@/lib/db/queries";
import type { Complaint, Operator, Payment } from "@/lib/db/schema";
import {
  deleteOperatorAction,
  updateBusDetailsAction,
  updateOperatorAction,
} from "@/lib/actions/bus";

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

const TAB_TRIGGER_CLASS =
  "rounded-none border-r-2 border-foreground px-6 py-2.5 text-xs font-bold uppercase tracking-wide last:border-r-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-accent data-[state=inactive]:hover:text-accent-foreground";

const DOC_FIELDS = [
  { key: "aadhar", label: "Aadhar Number" },
  { key: "drivingLicense", label: "Driving License" },
  { key: "rcNumber", label: "RC Number" },
  { key: "pollutionCertNo", label: "Pollution Cert No." },
  { key: "insurancePolicyNo", label: "Insurance Policy" },
] as const;

type DocFieldKey = (typeof DOC_FIELDS)[number]["key"];

const EDIT_DOC_INPUTS: {
  label: string;
  field: DocFieldKey;
  placeholder: string;
}[] = [
  { label: "Aadhar Number", field: "aadhar", placeholder: "XXXX XXXX XXXX" },
  {
    label: "Driving License",
    field: "drivingLicense",
    placeholder: "DL-XXXX-XXXXXXX",
  },
  { label: "RC Number", field: "rcNumber", placeholder: "KA-XX-XXXX-XXXXXX" },
  { label: "Pollution Cert No.", field: "pollutionCertNo", placeholder: "PUC/XXXX/XX" },
  {
    label: "Insurance Policy No.",
    field: "insurancePolicyNo",
    placeholder: "Policy number",
  },
];

function operatorInitials(companyName: string) {
  const parts = companyName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return companyName.slice(0, 2).toUpperCase() || "OP";
}

function pooledRating(buses: BusWithRouteIds[]): string {
  let onTime = 0;
  let slightlyLate = 0;
  let veryLate = 0;
  for (const b of buses) {
    const v = b.votes;
    onTime += v.onTime;
    slightlyLate += v.slightlyLate;
    veryLate += v.veryLate;
  }
  const n = onTime + slightlyLate + veryLate;
  if (n === 0) return "—";
  const score = (onTime * 5 + slightlyLate * 3 + veryLate * 1) / n;
  return score.toFixed(1);
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
    default:
      return null;
  }
}

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
  const [tab, setTab] = useState("info");
  const [busPanelId, setBusPanelId] = useState<string | null>(null);
  const [busSubTab, setBusSubTab] = useState<"info" | "edit">("info");

  const [companyName, setCompanyName] = useState(operator.companyName);
  const [phone, setPhone] = useState(operator.phone ?? "");
  const [docForm, setDocForm] = useState({
    aadhar: "",
    drivingLicense: "",
    rcNumber: "",
    pollutionCertNo: "",
    insurancePolicyNo: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shownDocFields, setShownDocFields] = useState<Set<string>>(
    () => new Set(),
  );

  const copyToClipboard = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied!", { duration: 1500 });
    } catch {
      toast.error("Copy failed");
    }
  }, []);

  const toggleDocShow = useCallback((field: string) => {
    setShownDocFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);

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
    setShownDocFields(new Set());
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

  const handleDelete = () => {
    startTransition(async () => {
      const r = await deleteOperatorAction(operator.id);
      if (r.success) {
        toast.success("Operator removed");
        onOpenChange(false);
        router.refresh();
      } else toast.error(r.error ?? "Failed");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-hidden rounded-none border-2 border-foreground p-0 sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Operator</DialogTitle>
        </DialogHeader>
        <div className="border-b-2 border-foreground px-4 py-3">
          <p
            className="text-xl font-black uppercase tracking-wide text-foreground"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {operator.companyName}
          </p>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v);
            setBusPanelId(null);
            setBusSubTab("info");
          }}
          className="flex flex-col gap-0"
        >
          <TabsList className="flex h-auto w-full flex-wrap rounded-none border-b-2 border-foreground bg-transparent p-0">
            <TabsTrigger
              value="info"
              className={TAB_TRIGGER_CLASS}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              INFO
            </TabsTrigger>
            <TabsTrigger
              value="bus-info"
              className={TAB_TRIGGER_CLASS}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              BUS INFO
            </TabsTrigger>
            {mode === "admin" && (
              <TabsTrigger
                value="edit"
                className={`${TAB_TRIGGER_CLASS} border-r-0`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                EDIT
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="info" className="mt-0">
            <div
              className="flex items-start gap-5 border-b-2 border-foreground p-5"
              style={{ background: "var(--bg-surface-2)" }}
            >
              <div
                className="flex h-24 w-24 shrink-0 items-center justify-center border-3 border-foreground bg-primary text-2xl font-black text-primary-foreground shadow-[4px_4px_0_hsl(var(--shadow-color))]"
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
                  {operator.phone?.trim() ? operator.phone : "—"}
                </p>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    ["Total buses", String(buses.length)],
                    ["Locations covering", String(locationsCount)],
                    ["Fines", String(finesTotal)],
                    ["Complaints", String(opComplaints.length)],
                    ["Warnings", String(warningsCount)],
                    ["Ratings", pooledRating(buses)],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="border-2 border-foreground p-3 text-center"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {label}
                    </p>
                    <p
                      className="text-2xl font-black text-foreground"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-0">
                {DOC_FIELDS.map(({ key, label }) => {
                  const value = docValue(operator, key);
                  const isShown = shownDocFields.has(key);
                  const display =
                    !value
                      ? "Not provided"
                      : isShown
                        ? value
                        : "•••• •••• ••••";
                  return (
                    <div
                      key={key}
                      className="mb-1 flex items-center justify-between border-2 border-foreground px-4 py-3"
                      style={{ background: "var(--bg-surface)" }}
                    >
                      <p
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {label}
                      </p>
                      <p
                        className="flex-1 text-center text-sm font-mono font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {display}
                      </p>
                      <div className="flex items-center gap-2">
                        {value ? (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(value)}
                            className="h-7 border-2 border-foreground px-2 text-[10px] font-bold uppercase transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            Copy
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleDocShow(key)}
                          className="h-7 border-2 border-foreground px-2 text-[10px] font-bold uppercase transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {isShown ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bus-info" className="mt-0 p-4">
            {busPanelId && selectedBus ? (
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
              <ScrollArea className="max-h-[320px] pr-3">
                <div className="pb-2">
                  {buses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No buses registered yet.
                    </p>
                  ) : (
                    buses.map((b) => (
                      <div
                        key={b.id}
                        className="mb-2 flex items-center justify-between border-2 border-foreground px-4 py-3 shadow-[2px_2px_0_hsl(var(--shadow-color))]"
                        style={{ background: "var(--bg-surface)" }}
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
                          className="h-8 border-2 border-foreground px-3 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-foreground hover:text-background"
                        >
                          VIEW →
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {mode === "admin" && (
            <TabsContent value="edit" className="mt-0 space-y-0 p-4">
              <Card className="rounded-none border-3 border-foreground shadow-[4px_4px_0_hsl(var(--shadow-color))]">
                <CardHeader className="border-b-3 border-foreground">
                  <CardTitle
                    className="font-black uppercase"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    Edit operator
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
                      Phone no
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 rounded-none border-2 border-foreground"
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    <p
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Operator Documents
                    </p>
                    {EDIT_DOC_INPUTS.map(({ label, field, placeholder }) => (
                      <div key={field}>
                        <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {label}
                        </Label>
                        <Input
                          value={docForm[field]}
                          onChange={(e) =>
                            setDocForm((prev) => ({
                              ...prev,
                              [field]: e.target.value,
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
                      className="rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
                      onClick={() =>
                        startTransition(async () => {
                          const r = await updateOperatorAction(operator.id, {
                            companyName: companyName.trim() || undefined,
                            phone: phone.trim(),
                            aadhar: docForm.aadhar,
                            drivingLicense: docForm.drivingLicense,
                            rcNumber: docForm.rcNumber,
                            pollutionCertNo: docForm.pollutionCertNo,
                            insurancePolicyNo: docForm.insurancePolicyNo,
                          });
                          if (r.success) {
                            toast.success("Operator updated");
                            router.refresh();
                            onOpenChange(false);
                          } else toast.error(r.error ?? "Failed");
                        })
                      }
                    >
                      Save changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6 rounded-none border-destructive border-3 shadow-[4px_4px_0_hsl(var(--shadow-color))]">
                <CardHeader className="border-b-3 border-destructive/50">
                  <CardTitle className="flex items-center gap-2 font-black uppercase text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="flex items-center justify-between border-2 border-destructive/50 bg-destructive/5 p-4">
                    <div className="min-w-0 pr-4">
                      <p className="font-bold text-destructive">
                        Delete Operator Account
                      </p>
                      <p className="text-sm text-muted-foreground">
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
                    <div className="space-y-3 border-2 border-destructive bg-destructive/5 p-4">
                      <Label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
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
                          className="flex-1 rounded-none border-2 border-foreground shadow-[3px_3px_0_hsl(var(--destructive))]"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Confirm Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

const NESTED_TAB_TRIGGER =
  "flex-1 rounded-none border-r-2 border-foreground py-2 text-xs font-bold uppercase last:border-r-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground";

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
  busSubTab: "info" | "edit";
  setBusSubTab: (t: "info" | "edit") => void;
  onBack: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [st, setSt] = useState(bus.status);
  const [note, setNote] = useState(bus.statusNote);
  const [driver, setDriver] = useState(bus.driverName);
  const [conductor, setConductor] = useState(bus.conductorName);
  const [occ, setOcc] = useState(String(bus.occupiedSeats));
  const [women, setWomen] = useState(String(bus.womenReservedAvailable));
  const [savePending, startSave] = useTransition();

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="ghost"
        className="rounded-none px-0 font-bold uppercase"
        onClick={onBack}
      >
        ← Back to buses
      </Button>
      <Tabs
        value={busSubTab}
        onValueChange={(v) => setBusSubTab(v as "info" | "edit")}
      >
        <TabsList className="h-auto w-full rounded-none border-2 border-foreground bg-transparent p-0">
          <TabsTrigger value="info" className={NESTED_TAB_TRIGGER}>
            Info
          </TabsTrigger>
          {mode === "admin" && (
            <TabsTrigger value="edit" className={NESTED_TAB_TRIGGER}>
              Edit
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="info" className="mt-3 space-y-2">
          {[
            ["Bus number", bus.number],
            ["License plate", bus.licensePlate],
            ["RC number", "—"],
            ["Pollution certificate", "—"],
            ["Insurance policy", "—"],
            ["Route", `${bus.origin} → ${bus.destination}`],
            ["Full fare", String(bus.fullFare)],
            ["Driver", bus.driverName],
            ["Conductor", bus.conductorName],
          ].map(([k, v]) => (
            <div key={k} className="border-2 border-foreground p-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                {k}
              </p>
              <p className="font-semibold text-foreground">{v}</p>
            </div>
          ))}
          <div className="border-2 border-foreground p-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">
              Status
            </p>
            <StatusBadge status={bus.status} />
          </div>
          <div className="flex flex-wrap gap-1">
            {bus.schedule.map((t) => (
              <span
                key={t}
                className="border-2 border-foreground px-2 py-0.5 text-xs font-bold"
              >
                {t}
              </span>
            ))}
          </div>
        </TabsContent>
        {mode === "admin" && (
          <TabsContent value="edit" className="mt-3 space-y-3">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Status
              <select
                value={st}
                onChange={(e) =>
                  setSt(e.target.value as typeof bus.status)
                }
                className="mt-1 h-10 w-full rounded-none border-2 border-foreground bg-background px-2 text-sm"
              >
                <option>Running</option>
                <option>Not Running</option>
                <option>Delayed</option>
              </select>
            </label>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Status note
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 rounded-none border-2 border-foreground"
              />
            </label>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Driver name
              <Input
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                className="mt-1 rounded-none border-2 border-foreground"
              />
            </label>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Conductor name
              <Input
                value={conductor}
                onChange={(e) => setConductor(e.target.value)}
                className="mt-1 rounded-none border-2 border-foreground"
              />
            </label>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Occupied seats
              <Input
                type="number"
                value={occ}
                onChange={(e) => setOcc(e.target.value)}
                className="mt-1 rounded-none border-2 border-foreground"
              />
            </label>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Women reserved available
              <Input
                type="number"
                value={women}
                onChange={(e) => setWomen(e.target.value)}
                className="mt-1 rounded-none border-2 border-foreground"
              />
            </label>
            <Button
              type="button"
              disabled={savePending}
              className="w-full rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
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
                  if (r.success) {
                    onSaved();
                    router.refresh();
                  } else toast.error(r.error ?? "Failed");
                })
              }
            >
              Save
            </Button>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
