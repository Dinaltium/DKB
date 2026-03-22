"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [approved, setApproved] = useState(operator.approved);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab("info");
    setBusPanelId(null);
    setBusSubTab("info");
    setCompanyName(operator.companyName);
    setPhone(operator.phone ?? "");
    setApproved(operator.approved);
    setDeleteConfirm("");
  }, [open, operator.id, operator.companyName, operator.phone, operator.approved]);

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

  const resetLocalForm = () => {
    setCompanyName(operator.companyName);
    setPhone(operator.phone ?? "");
    setApproved(operator.approved);
    setDeleteConfirm("");
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
          <TabsList className="h-auto w-full flex-wrap rounded-none border-b-2 border-foreground bg-transparent p-0">
            <TabsTrigger
              value="info"
              className="rounded-none border-r-2 border-foreground px-4 py-2 text-xs font-bold uppercase tracking-wide data-[state=active]:bg-foreground data-[state=active]:text-background sm:px-6"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              INFO
            </TabsTrigger>
            <TabsTrigger
              value="bus-info"
              className="rounded-none border-r-2 border-foreground px-4 py-2 text-xs font-bold uppercase tracking-wide data-[state=active]:bg-foreground data-[state=active]:text-background sm:px-6"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              BUS INFO
            </TabsTrigger>
            {mode === "admin" && (
              <TabsTrigger
                value="edit"
                className="rounded-none px-4 py-2 text-xs font-bold uppercase tracking-wide data-[state=active]:bg-foreground data-[state=active]:text-background sm:px-6"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                EDIT
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="info" className="mt-0 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div
                className="flex h-24 w-24 shrink-0 items-center justify-center border-2 border-foreground bg-primary text-2xl font-black text-primary-foreground"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {operatorInitials(operator.companyName)}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Name
                  </p>
                  <p className="font-bold text-foreground">
                    {operator.companyName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Email ID
                  </p>
                  <p className="font-bold text-foreground">
                    {user.email ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Phone number
                  </p>
                  <p className="font-bold text-foreground">
                    {operator.phone?.trim() ? operator.phone : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
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

            <div className="mt-6 border-2 border-foreground p-3">
              <p className="text-sm text-muted-foreground">
                Additional operator information can be added in the Edit tab.
              </p>
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
                <div className="space-y-2 pb-2">
                  {buses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No buses registered yet.
                    </p>
                  ) : (
                    buses.map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-2 border-foreground p-3 shadow-[2px_2px_0_hsl(var(--foreground))]"
                      >
                        <span
                          className="border-2 border-foreground px-2 py-0.5 text-[10px] font-black uppercase"
                          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                        >
                          {b.licensePlate}
                        </span>
                        <StatusBadge status={b.status} />
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-none border-2 border-foreground bg-background font-bold uppercase shadow-[2px_2px_0_hsl(var(--foreground))]"
                          onClick={() => {
                            setBusPanelId(b.id);
                            setBusSubTab("info");
                          }}
                        >
                          View →
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {mode === "admin" && (
            <TabsContent value="edit" className="mt-0 space-y-4 p-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Name
                  </label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 rounded-none border-2 border-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Email ID
                  </label>
                  <Input
                    value={user.email ?? ""}
                    readOnly
                    disabled
                    className="mt-1 rounded-none border-2 border-foreground opacity-70"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Phone no
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 rounded-none border-2 border-foreground"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    className="rounded-none border-2 border-foreground font-bold uppercase shadow-[2px_2px_0_hsl(var(--foreground))]"
                    onClick={() => setApproved(true)}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    className="rounded-none border-2 border-foreground font-bold uppercase shadow-[2px_2px_0_hsl(var(--foreground))]"
                    onClick={() => setApproved(false)}
                  >
                    Revoke
                  </Button>
                </div>
                <Button
                  type="button"
                  disabled={isPending}
                  className="w-full rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
                  onClick={() =>
                    startTransition(async () => {
                      const r = await updateOperatorAction(operator.id, {
                        companyName: companyName.trim() || undefined,
                        phone: phone.trim(),
                        approved,
                      });
                      if (r.success) {
                        toast.success("Operator updated");
                        router.refresh();
                        onOpenChange(false);
                        resetLocalForm();
                      } else toast.error(r.error ?? "Failed");
                    })
                  }
                >
                  Save changes
                </Button>
              </div>

              <Separator className="my-6 border-2 border-dashed border-destructive" />
              <p
                className="text-center text-xs font-black uppercase tracking-widest text-destructive"
              >
                Danger zone
              </p>
              <div className="border-2 border-destructive p-4">
                <p className="mb-1 text-sm font-bold uppercase text-destructive">
                  Delete operator account
                </p>
                <p className="mb-4 text-xs text-muted-foreground">
                  This permanently removes the operator, their account, and
                  dissociates their buses. This cannot be undone.
                </p>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Type the company name to confirm:
                </label>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="mb-3 rounded-none border-2 border-foreground"
                />
                <Button
                  variant="destructive"
                  disabled={deleteConfirm !== operator.companyName || isPending}
                  className="w-full rounded-none border-2 border-red-800 shadow-[3px_3px_0_rgb(153,27,27)]"
                  onClick={() =>
                    startTransition(async () => {
                      const r = await deleteOperatorAction(operator.id);
                      if (r.success) {
                        toast.success("Operator removed");
                        onOpenChange(false);
                        router.refresh();
                      } else toast.error(r.error ?? "Failed");
                    })
                  }
                >
                  Delete operator
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

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
          <TabsTrigger
            value="info"
            className="flex-1 rounded-none border-r-2 border-foreground py-2 text-xs font-bold uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            Info
          </TabsTrigger>
          {mode === "admin" && (
            <TabsTrigger
              value="edit"
              className="flex-1 rounded-none py-2 text-xs font-bold uppercase data-[state=active]:bg-foreground data-[state=active]:text-background"
            >
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
