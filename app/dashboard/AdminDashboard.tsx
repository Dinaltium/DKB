"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddBusModal } from "@/components/modals/AddBusModal";
import { CreateOperatorModal } from "@/components/modals/CreateOperatorModal";
import { ImportStopsModal } from "@/components/modals/ImportStopsModal";
import { OperatorModal } from "@/components/modals/OperatorModal";
import { BusInfoPanel } from "@/components/shared/BusInfoPanel";
import type { BusWithRouteIds } from "@/lib/db/queries";
import type {
  BusRequest,
  Complaint,
  Operator,
  Payment,
  Stop,
} from "@/lib/db/schema";
import {
  addStopAction,
  adminAddBusAction,
  approveBusRequestAction,
  createOperatorAction,
  deleteStopAction,
  importStopsAction,
  rejectBusRequestAction,
  resolveComplaintAction,
} from "@/lib/actions/bus";

export interface OperatorRow {
  operator: Operator;
  user: {
    name: string | null;
    email: string | null;
    mustChangePassword: boolean;
    passwordExpiresAt: Date | null;
    createdAt: Date;
  };
}
interface BusRequestRow {
  request: BusRequest;
  operator: Operator;
  user: { name: string | null; email: string | null };
}
interface Props {
  buses: BusWithRouteIds[];
  operators: OperatorRow[];
  complaints: Complaint[];
  busRequests: BusRequestRow[];
  stops: Stop[];
  payments: Payment[];
}
type Tab = "operators" | "buses" | "complaints" | "stops";

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

// ── Inline Bus Info Modal ─────────────────────────────────────────────────────
// Wraps BusInfoPanel in a modal overlay — same component used in OperatorModal

function BusInfoModal({
  bus,
  allStops,
  operatorName,
  complaints,
  payments,
  onClose,
}: {
  bus: BusWithRouteIds;
  allStops: Stop[];
  operatorName?: string;
  complaints: Complaint[];
  payments: Payment[];
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" />
      <div
        className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border-2 border-foreground"
        style={{
          background: "var(--bg-surface)",
          maxHeight: "90vh",
          boxShadow: "6px 6px 0 hsl(var(--shadow-color))",
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b-2 border-foreground px-4 py-3">
          <p
            className="text-xl font-black uppercase tracking-wide"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--text-primary)",
            }}
          >
            Bus {bus.number}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border-2 border-foreground font-black text-sm hover:bg-foreground hover:text-background transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 min-h-0 overflow-y-auto p-4"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "var(--text-primary) transparent",
          }}
        >
          <BusInfoPanel
            bus={bus}
            allStops={allStops}
            operatorName={operatorName}
            complaints={complaints}
            payments={payments}
            mode="admin"
            onSaved={() => {
              toast.success("Bus updated");
              onClose();
            }}
          />
        </div>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminDashboard({
  buses,
  operators,
  complaints,
  busRequests,
  stops,
  payments,
}: Props) {
  const [tab, setTab] = useState<Tab>("operators");
  const [isPending, startTransition] = useTransition();
  const [addBusOpen, setAddBusOpen] = useState(false);
  const [createOpOpen, setCreateOpOpen] = useState(false);
  const [operatorModal, setOperatorModal] = useState<{
    id: string;
    mode: "admin" | "view";
  } | null>(null);

  // Bus info modal (for the buses tab VIEW INFO)
  const [busInfoModal, setBusInfoModal] = useState<string | null>(null); // busId

  const [importPreview, setImportPreview] = useState<Stop[] | null>(null);
  const [stopSearch, setStopSearch] = useState("");
  const [showAddStop, setShowAddStop] = useState(false);
  const [newStopName, setNewStopName] = useState("");
  const [newStopId, setNewStopId] = useState("");
  const [newStopLat, setNewStopLat] = useState("");
  const [newStopLng, setNewStopLng] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const filteredStops = useMemo(
    () =>
      stops.filter((s) =>
        s.name.toLowerCase().includes(stopSearch.toLowerCase()),
      ),
    [stops, stopSearch],
  );

  const busesByOperatorId = useMemo(() => {
    const map: Record<string, BusWithRouteIds[]> = {};
    for (const b of buses) {
      if (!b.operatorId) continue;
      map[b.operatorId] = map[b.operatorId] ?? [];
      map[b.operatorId].push(b);
    }
    return map;
  }, [buses]);

  const operatorById = Object.fromEntries(
    operators.map((o) => [o.operator.id, o]),
  );

  // Operator name lookup for buses
  const operatorNameForBus = (bus: BusWithRouteIds): string | undefined => {
    if (!bus.operatorId) return undefined;
    return operatorById[bus.operatorId]?.operator.companyName;
  };

  const handleImportPick = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Stop[];
        const valid =
          Array.isArray(parsed) &&
          parsed.every(
            (s) =>
              typeof s.id === "string" &&
              typeof s.name === "string" &&
              typeof s.lat === "number" &&
              typeof s.lng === "number",
          );
        if (!valid) {
          toast.error(
            "Invalid JSON format. Expected array of {id, name, lat, lng}",
          );
          return;
        }
        setImportPreview(parsed);
      } catch {
        toast.error(
          "Invalid JSON format. Expected array of {id, name, lat, lng}",
        );
      }
    };
    reader.readAsText(file);
  };

  const exportStops = () => {
    const blob = new Blob([JSON.stringify(stops, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "buslink-stops.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const modalRow = operatorModal ? operatorById[operatorModal.id] : undefined;
  const busInfoModalBus = busInfoModal
    ? buses.find((b) => b.id === busInfoModal)
    : null;

  return (
    <div className="space-y-5">
      {/* ── Tab bar ── */}
      <div
        className="flex gap-2 border-b-2"
        style={{ borderColor: "var(--border-default)" }}
      >
        {(["operators", "buses", "complaints", "stops"] as const).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-4 py-2 text-sm font-bold uppercase tracking-wide"
            style={{
              color: tab === id ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom:
                tab === id
                  ? "2px solid var(--cta-bg)"
                  : "2px solid transparent",
              marginBottom: "-2px",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            {id}
          </button>
        ))}
      </div>

      {/* ══════════════════ OPERATORS ══════════════════ */}
      {tab === "operators" && (
        <section className="space-y-3">
          <Button
            type="button"
            onClick={() => setCreateOpOpen(true)}
            className="h-10 rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
          >
            + Create operator account
          </Button>
          {operators.map(({ operator, user }) => {
            const opBuses = busesByOperatorId[operator.id] ?? [];
            const shown = opBuses.slice(0, 2);
            const extra = opBuses.length - shown.length;
            return (
              <article
                key={operator.id}
                className="border-2 p-4"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--text-primary)",
                  boxShadow: "4px 4px 0 var(--text-primary)",
                }}
              >
                <p
                  className="text-2xl font-extrabold uppercase"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    color: "var(--text-primary)",
                  }}
                >
                  {operator.companyName}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {user.email ?? "No email"}
                  {operator.phone ? ` • ${operator.phone}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {opBuses.length === 0 ? (
                    <span style={{ color: "var(--text-muted)" }}>
                      No buses registered
                    </span>
                  ) : (
                    <>
                      {shown.map((b) => (
                        <span
                          key={b.id}
                          className="border-2 px-2 py-0.5 text-[10px] font-black"
                          style={{
                            background: "var(--cta-bg)",
                            borderColor: "var(--text-primary)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {b.number}
                        </span>
                      ))}
                      {extra > 0 && (
                        <span
                          className="border-2 px-2 py-0.5 text-[10px] font-black"
                          style={{
                            borderColor: "var(--text-primary)",
                            color: "var(--text-primary)",
                          }}
                        >
                          +{extra} more
                        </span>
                      )}
                    </>
                  )}
                  <span className="ml-auto">
                    <StatusBadge
                      status={operator.approved ? "approved" : "pending"}
                    />
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setOperatorModal({ id: operator.id, mode: "admin" })
                    }
                    className="h-9 rounded-none border-2 border-foreground font-bold uppercase shadow-[2px_2px_0_hsl(var(--foreground))]"
                  >
                    VIEW DETAILS →
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ══════════════════ STOPS ══════════════════ */}
      {tab === "stops" && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportPick(f);
                e.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="h-10 rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
            >
              IMPORT JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={exportStops}
              className="h-10 rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
            >
              EXPORT JSON
            </Button>
            <Button
              type="button"
              onClick={() => setShowAddStop((v) => !v)}
              className="h-10 rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
            >
              + ADD STOP
            </Button>
          </div>

          {showAddStop && (
            <form
              className="grid gap-2 border-2 p-3 md:grid-cols-4"
              style={{
                borderColor: "var(--text-primary)",
                background: "var(--bg-surface)",
              }}
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const res = await addStopAction({
                    id: newStopId.trim(),
                    name: newStopName.trim(),
                    lat: Number(newStopLat),
                    lng: Number(newStopLng),
                  });
                  if (res.success) {
                    toast.success("Stop added");
                    setNewStopName("");
                    setNewStopId("");
                    setNewStopLat("");
                    setNewStopLng("");
                  } else toast.error(res.error ?? "Failed");
                });
              }}
            >
              <Input
                value={newStopName}
                onChange={(e) => {
                  setNewStopName(e.target.value);
                  setNewStopId(slugify(e.target.value));
                }}
                placeholder="Stop Name"
                required
                className="rounded-none border-2 border-foreground md:col-span-1"
              />
              <Input
                value={newStopId}
                onChange={(e) => setNewStopId(e.target.value)}
                placeholder="Stop ID"
                required
                className="rounded-none border-2 border-foreground"
              />
              <Input
                value={newStopLat}
                onChange={(e) => setNewStopLat(e.target.value)}
                type="number"
                step="0.000001"
                placeholder="Latitude"
                required
                className="rounded-none border-2 border-foreground"
              />
              <Input
                value={newStopLng}
                onChange={(e) => setNewStopLng(e.target.value)}
                type="number"
                step="0.000001"
                placeholder="Longitude"
                required
                className="rounded-none border-2 border-foreground"
              />
              <Button
                type="submit"
                disabled={isPending}
                className="h-10 rounded-none border-2 border-foreground font-bold uppercase md:col-span-4 shadow-[3px_3px_0_hsl(var(--foreground))]"
              >
                Save Stop
              </Button>
            </form>
          )}

          <Input
            value={stopSearch}
            onChange={(e) => setStopSearch(e.target.value)}
            placeholder="Search stops by name..."
            className="h-10 w-full rounded-none border-2 border-foreground"
          />
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            {stops.length} stops total
          </p>

          {filteredStops.length === 0 ? (
            <EmptyState
              title="No stops added yet."
              description="Use Import JSON or Add Stop to get started."
            />
          ) : (
            <ScrollArea className="max-h-[480px]">
              <div className="space-y-2 pr-3">
                {filteredStops.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 border-2 border-foreground px-3 py-2"
                    style={{ background: "var(--bg-surface)" }}
                  >
                    <span
                      className="flex-1 text-lg font-bold uppercase"
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        color: "var(--text-primary)",
                      }}
                    >
                      {s.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.id}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.lat.toFixed(6)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.lng.toFixed(6)}
                    </span>
                    <Button
                      type="button"
                      disabled={isPending}
                      variant="destructive"
                      size="icon"
                      onClick={() =>
                        startTransition(async () => {
                          const r = await deleteStopAction(s.id);
                          if (r.success) toast.success("Stop deleted");
                          else toast.error(r.error ?? "Failed");
                        })
                      }
                      className="h-8 w-8 rounded-none border-2 border-foreground text-xs font-black"
                    >
                      🗑
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </section>
      )}

      {/* ══════════════════ BUSES ══════════════════ */}
      {tab === "buses" && (
        <section className="space-y-3">
          <Button
            type="button"
            onClick={() => setAddBusOpen(true)}
            className="h-10 rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
          >
            + ADD BUS
          </Button>

          {buses.map((bus) => (
            <div
              key={bus.id}
              className="border-2 p-3"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--text-primary)",
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p
                    className="text-2xl font-extrabold uppercase"
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      color: "var(--text-primary)",
                    }}
                  >
                    {bus.number}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {bus.origin} → {bus.destination}
                    {bus.operatorId && operatorById[bus.operatorId] && (
                      <span
                        className="ml-2 font-semibold"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        · {operatorById[bus.operatorId].operator.companyName}
                      </span>
                    )}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={bus.status} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* VIEW INFO — opens BusInfoPanel modal (same component as in OperatorModal) */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBusInfoModal(bus.id)}
                    className="h-9 rounded-none border-2 border-foreground bg-background font-bold uppercase text-foreground shadow-[2px_2px_0_hsl(var(--foreground))]"
                  >
                    VIEW INFO
                  </Button>
                  <Link
                    href={`/bus/${bus.id}`}
                    className="inline-flex h-9 items-center rounded-none border-2 border-foreground bg-primary px-3 text-xs font-bold uppercase text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))]"
                  >
                    CHECK BUS
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {/* Bus requests */}
          {busRequests.map((row) => (
            <div
              key={row.request.id}
              className="border-2 p-3"
              style={{
                borderColor: "var(--text-primary)",
                background: "var(--bg-surface)",
              }}
            >
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                {row.request.number}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {row.operator.companyName}
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  disabled={isPending}
                  variant="outline"
                  onClick={() =>
                    startTransition(async () => {
                      const r = await approveBusRequestAction(row.request.id);
                      if (r.success) toast.success("Bus request approved");
                      else toast.error(r.error ?? "Failed");
                    })
                  }
                  className="h-8 rounded-none border-2 border-foreground font-bold uppercase shadow-[2px_2px_0_hsl(var(--foreground))]"
                >
                  APPROVE
                </Button>
                <Button
                  type="button"
                  disabled={isPending}
                  variant="outline"
                  onClick={() =>
                    startTransition(async () => {
                      const r = await rejectBusRequestAction(row.request.id);
                      if (r.success) toast.success("Bus request rejected");
                      else toast.error(r.error ?? "Failed");
                    })
                  }
                  className="h-8 rounded-none border-2 border-destructive font-bold uppercase text-destructive shadow-[2px_2px_0_hsl(var(--destructive))]"
                >
                  REJECT
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ══════════════════ COMPLAINTS ══════════════════ */}
      {tab === "complaints" && (
        <section className="space-y-2">
          {complaints.map((c) => (
            <article
              key={c.id}
              className="border-2 p-3"
              style={{
                borderColor: "var(--text-primary)",
                background: "var(--bg-surface)",
              }}
            >
              <p
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {c.busNumber} • {c.category}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {c.description}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={c.status} />
                {c.status === "pending" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      startTransition(async () => {
                        const r = await resolveComplaintAction(c.id);
                        if (r.success) toast.success("Complaint resolved");
                        else toast.error(r.error ?? "Failed");
                      })
                    }
                    className="h-8 rounded-none border-2 border-foreground font-bold uppercase shadow-[2px_2px_0_hsl(var(--foreground))]"
                  >
                    RESOLVE
                  </Button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {/* ══════════════════ MODALS ══════════════════ */}

      {/* Add Bus */}
      {addBusOpen && (
        <AddBusModal
          operators={operators.filter((o) => o.operator.approved)}
          stops={stops}
          onClose={() => setAddBusOpen(false)}
          onSubmit={(data) =>
            startTransition(async () => {
              const r = await adminAddBusAction(data);
              if (r.success) {
                toast.success("Bus added");
                setAddBusOpen(false);
              } else toast.error(r.error ?? "Failed");
            })
          }
          isPending={isPending}
        />
      )}

      {/* Create Operator */}
      {createOpOpen && (
        <CreateOperatorModal
          onClose={() => setCreateOpOpen(false)}
          isPending={isPending}
          onSubmit={(data) =>
            startTransition(async () => {
              const r = await createOperatorAction(data);
              if (r.success) {
                toast.success("Operator account created");
                setCreateOpOpen(false);
              } else toast.error(r.error ?? "Failed");
            })
          }
        />
      )}

      {/* Operator detail modal */}
      {operatorModal && modalRow && (
        <OperatorModal
          open
          onOpenChange={(o) => {
            if (!o) setOperatorModal(null);
          }}
          operator={modalRow.operator}
          user={{
            name: modalRow.user.name,
            email: modalRow.user.email,
            createdAt: modalRow.user.createdAt,
            mustChangePassword: modalRow.user.mustChangePassword,
          }}
          buses={busesByOperatorId[operatorModal.id] ?? []}
          complaints={complaints}
          payments={payments}
          mode={operatorModal.mode}
          allStops={stops}
        />
      )}

      {/* Bus Info Modal — same BusInfoPanel component, used in buses tab */}
      {busInfoModal && busInfoModalBus && (
        <BusInfoModal
          bus={busInfoModalBus}
          allStops={stops}
          operatorName={operatorNameForBus(busInfoModalBus)}
          complaints={complaints}
          payments={payments}
          onClose={() => setBusInfoModal(null)}
        />
      )}

      {/* Import Stops */}
      {importPreview && (
        <ImportStopsModal
          data={importPreview}
          onClose={() => setImportPreview(null)}
          onConfirm={() =>
            startTransition(async () => {
              const r = await importStopsAction(importPreview);
              if (r.success) {
                toast.success(
                  `Imported ${r.count ?? importPreview.length} stops`,
                );
                setImportPreview(null);
              } else toast.error(r.error ?? "Failed");
            })
          }
          isPending={isPending}
        />
      )}
    </div>
  );
}
