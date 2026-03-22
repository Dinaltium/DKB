"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import { StopBuilder } from "@/app/components/StopBuilder";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Bus as BusType, BusRequest, Complaint, Operator, Stop } from "@/lib/db/schema";
import {
  addStopAction,
  adminAddBusAction,
  approveBusRequestAction,
  createOperatorAction,
  deleteOperatorAction,
  deleteStopAction,
  importStopsAction,
  reassignBusAction,
  rejectBusRequestAction,
  resolveComplaintAction,
  setOperatorApprovalAction,
  updateOperatorAction,
} from "@/lib/actions/bus";

interface OperatorRow {
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
  buses: BusType[];
  operators: OperatorRow[];
  complaints: Complaint[];
  busRequests: BusRequestRow[];
  stops: Stop[];
}
type Tab = "operators" | "buses" | "complaints" | "stops";

const slugify = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");

export function AdminDashboard({ buses, operators, complaints, busRequests, stops }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("operators");
  const [isPending, startTransition] = useTransition();
  const [addBusOpen, setAddBusOpen] = useState(false);
  const [createOpOpen, setCreateOpOpen] = useState(false);
  const [detailOpId, setDetailOpId] = useState<string | null>(null);
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
    const map: Record<string, BusType[]> = {};
    for (const b of buses) {
      if (!b.operatorId) continue;
      map[b.operatorId] = map[b.operatorId] ?? [];
      map[b.operatorId].push(b);
    }
    return map;
  }, [buses]);

  const operatorById = Object.fromEntries(operators.map((o) => [o.operator.id, o]));

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
          toast.error("Invalid JSON format. Expected array of {id, name, lat, lng}");
          return;
        }
        setImportPreview(parsed);
      } catch {
        toast.error("Invalid JSON format. Expected array of {id, name, lat, lng}");
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

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b-2" style={{ borderColor: "var(--border-default)" }}>
        {(["operators", "buses", "complaints", "stops"] as const).map((id) => (
          <button key={id} onClick={() => setTab(id)} className="px-4 py-2 text-sm font-bold uppercase tracking-wide" style={{ color: tab === id ? "var(--text-primary)" : "var(--text-muted)", borderBottom: tab === id ? "2px solid var(--cta-bg)" : "2px solid transparent", marginBottom: "-2px", fontFamily: "'Barlow Condensed', sans-serif" }}>
            {id}
          </button>
        ))}
      </div>

      {tab === "operators" && (
        <section className="space-y-3">
          <button onClick={() => setCreateOpOpen(true)} className="h-10 border-2 px-4 text-xs font-bold uppercase tracking-wide" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)", boxShadow: "3px 3px 0 var(--text-primary)" }}>
            + CREATE OPERATOR ACCOUNT
          </button>
          {operators.map(({ operator, user }) => {
            const opBuses = busesByOperatorId[operator.id] ?? [];
            const shown = opBuses.slice(0, 2);
            const extra = opBuses.length - shown.length;
            return (
              <article key={operator.id} className="border-2 p-4" style={{ background: "var(--bg-surface)", borderColor: "var(--text-primary)", boxShadow: "4px 4px 0 var(--text-primary)" }}>
                <p className="text-2xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}>
                  {operator.companyName}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {user.email ?? "No email"} {operator.phone ? ` • ${operator.phone}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {opBuses.length === 0 ? (
                    <span style={{ color: "var(--text-muted)" }}>No buses registered</span>
                  ) : (
                    <>
                      {shown.map((b) => (
                        <span key={b.id} className="border-2 px-2 py-0.5 text-[10px] font-black" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>
                          {b.number}
                        </span>
                      ))}
                      {extra > 0 && <span className="border-2 px-2 py-0.5 text-[10px] font-black" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>+{extra} more</span>}
                    </>
                  )}
                  <span className="ml-auto"><StatusBadge status={operator.approved ? "approved" : "pending"} /></span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button disabled={isPending} onClick={() => startTransition(async () => { const r = await setOperatorApprovalAction(operator.id, !operator.approved); r.success ? toast.success(operator.approved ? "Operator revoked" : "Operator approved") : toast.error(r.error ?? "Failed"); })} className="h-9 border-2 px-3 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>
                    {operator.approved ? "REVOKE" : "APPROVE"}
                  </button>
                  <button onClick={() => setDetailOpId(operator.id)} className="h-9 border-2 px-3 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>
                    VIEW DETAILS →
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {tab === "stops" && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportPick(f); e.currentTarget.value = ""; }} />
            <button onClick={() => fileRef.current?.click()} className="h-10 border-2 px-4 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)", boxShadow: "3px 3px 0 var(--text-primary)" }}>IMPORT JSON</button>
            <button onClick={exportStops} className="h-10 border-2 px-4 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)", boxShadow: "3px 3px 0 var(--text-primary)" }}>EXPORT JSON</button>
            <button onClick={() => setShowAddStop((v) => !v)} className="h-10 border-2 px-4 text-xs font-bold uppercase" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)", boxShadow: "3px 3px 0 var(--text-primary)" }}>+ ADD STOP</button>
          </div>

          {showAddStop && (
            <form
              className="grid gap-2 border-2 p-3 md:grid-cols-4"
              style={{ borderColor: "var(--text-primary)", background: "var(--bg-surface)" }}
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
                    setNewStopName(""); setNewStopId(""); setNewStopLat(""); setNewStopLng("");
                  } else toast.error(res.error ?? "Failed");
                });
              }}
            >
              <input value={newStopName} onChange={(e) => { setNewStopName(e.target.value); setNewStopId(slugify(e.target.value)); }} placeholder="Stop Name" required className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
              <input value={newStopId} onChange={(e) => setNewStopId(e.target.value)} placeholder="Stop ID" required className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
              <input value={newStopLat} onChange={(e) => setNewStopLat(e.target.value)} type="number" step="0.000001" placeholder="Latitude" required className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
              <input value={newStopLng} onChange={(e) => setNewStopLng(e.target.value)} type="number" step="0.000001" placeholder="Longitude" required className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
              <button disabled={isPending} className="h-10 border-2 px-4 text-xs font-bold uppercase md:col-span-4" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>Save Stop</button>
            </form>
          )}

          <input value={stopSearch} onChange={(e) => setStopSearch(e.target.value)} placeholder="Search stops by name..." className="h-10 w-full border-2 px-3 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{stops.length} stops total</p>

          {filteredStops.length === 0 ? (
            <EmptyState title="No stops added yet." description="Use Import JSON or Add Stop to get started." />
          ) : (
            filteredStops.map((s) => (
              <div key={s.id} className="flex items-center gap-2 border-2 px-3 py-2" style={{ background: "var(--bg-surface)", borderColor: "var(--text-primary)" }}>
                <span className="flex-1 text-lg font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}>{s.name}</span>
                <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>{s.id}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.lat.toFixed(6)}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.lng.toFixed(6)}</span>
                <button disabled={isPending} onClick={() => startTransition(async () => { const r = await deleteStopAction(s.id); r.success ? toast.success("Stop deleted") : toast.error(r.error ?? "Failed"); })} className="h-8 w-8 border-2 text-xs font-black" style={{ borderColor: "var(--status-stopped-border)", color: "var(--status-stopped-text)" }}>🗑</button>
              </div>
            ))
          )}
        </section>
      )}

      {tab === "buses" && (
        <section className="space-y-3">
          <button onClick={() => setAddBusOpen(true)} className="h-10 border-2 px-4 text-xs font-bold uppercase" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>+ ADD BUS</button>
          {buses.map((bus) => (
            <div key={bus.id} className="border-2 p-3" style={{ background: "var(--bg-surface)", borderColor: "var(--text-primary)" }}>
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-2xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}>{bus.number}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>{bus.origin} → {bus.destination}</p></div>
                <div className="flex gap-2">
                  <select
                    defaultValue={bus.operatorId ?? ""}
                    onChange={(e) =>
                      startTransition(async () => {
                        const v = e.target.value;
                        const r = await reassignBusAction(
                          bus.id,
                          v === "" ? null : v,
                        );
                        r.success
                          ? toast.success("Bus reassigned")
                          : toast.error(r.error ?? "Failed");
                      })
                    }
                    className="h-9 border-2 px-2 text-xs"
                    style={{
                      background: "var(--input-bg)",
                      borderColor: "var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  >
                    <option value="">— Unassigned —</option>
                    {operators.map(({ operator }) => (
                      <option key={operator.id} value={operator.id}>
                        {operator.companyName}
                      </option>
                    ))}
                  </select>
                  <Link href={`/bus/${bus.id}`} className="inline-flex h-9 items-center border-2 px-3 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>VIEW</Link>
                </div>
              </div>
            </div>
          ))}
          {busRequests.map((row) => (
            <div key={row.request.id} className="border-2 p-3" style={{ borderColor: "var(--text-primary)", background: "var(--bg-surface)" }}>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>{row.request.number}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{row.operator.companyName}</p>
              <div className="mt-2 flex gap-2">
                <button disabled={isPending} onClick={() => startTransition(async () => { const r = await approveBusRequestAction(row.request.id); r.success ? toast.success("Bus request approved") : toast.error(r.error ?? "Failed"); })} className="h-8 border-2 px-2 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>APPROVE</button>
                <button disabled={isPending} onClick={() => startTransition(async () => { const r = await rejectBusRequestAction(row.request.id); r.success ? toast.success("Bus request rejected") : toast.error(r.error ?? "Failed"); })} className="h-8 border-2 px-2 text-xs font-bold uppercase" style={{ borderColor: "var(--status-stopped-border)", color: "var(--status-stopped-text)" }}>REJECT</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "complaints" && (
        <section className="space-y-2">
          {complaints.map((c) => (
            <article key={c.id} className="border-2 p-3" style={{ borderColor: "var(--text-primary)", background: "var(--bg-surface)" }}>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{c.busNumber} • {c.category}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={c.status} />
                {c.status === "pending" && (
                  <button onClick={() => startTransition(async () => { const r = await resolveComplaintAction(c.id); r.success ? toast.success("Complaint resolved") : toast.error(r.error ?? "Failed"); })} className="h-8 border-2 px-2 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>RESOLVE</button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      {addBusOpen && (
        <AdminAddBusModal
          operators={operators.filter((o) => o.operator.approved)}
          stops={stops}
          onClose={() => setAddBusOpen(false)}
          onSubmit={(data) => startTransition(async () => { const r = await adminAddBusAction(data); r.success ? (toast.success("Bus added"), setAddBusOpen(false)) : toast.error(r.error ?? "Failed"); })}
          isPending={isPending}
        />
      )}
      {createOpOpen && <CreateOperatorModal onClose={() => setCreateOpOpen(false)} isPending={isPending} onSubmit={(data) => startTransition(async () => { const r = await createOperatorAction(data); r.success ? (toast.success("Operator account created"), setCreateOpOpen(false)) : toast.error(r.error ?? "Failed"); })} />}
      {detailOpId && (
        <OperatorDetailModal
          operatorRow={operatorById[detailOpId]}
          buses={busesByOperatorId[detailOpId] ?? []}
          onClose={() => setDetailOpId(null)}
          isPending={isPending}
          startTransition={startTransition}
          router={router}
        />
      )}
      {importPreview && <ImportPreviewModal data={importPreview} onClose={() => setImportPreview(null)} onConfirm={() => startTransition(async () => { const r = await importStopsAction(importPreview); r.success ? (toast.success(`Imported ${r.count ?? importPreview.length} stops`), setImportPreview(null)) : toast.error(r.error ?? "Failed"); })} isPending={isPending} />}
    </div>
  );
}

function ModalFrame({ title, onClose, children, max = "max-w-2xl" }: { title: string; onClose: () => void; children: React.ReactNode; max?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 z-40 bg-black/60" />
      <div className={`z-50 w-full ${max} border-2 p-4`} style={{ background: "var(--bg-surface)", borderColor: "var(--text-primary)", boxShadow: "4px 4px 0 var(--text-primary)" }}>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-2xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}>{title}</p>
          <button onClick={onClose} className="h-8 w-8 border-2 text-xs font-black" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateOperatorModal({ onClose, onSubmit, isPending }: { onClose: () => void; onSubmit: (data: { companyName: string; email: string; password: string; phone?: string }) => void; isPending: boolean }) {
  const [companyName, setCompanyName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [phone, setPhone] = useState("");
  return <ModalFrame title="CREATE OPERATOR ACCOUNT" onClose={onClose} max="max-w-lg"><form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); onSubmit({ companyName, email, password, phone: phone || undefined }); }}>
    <input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company / Operator Name" className="h-10 w-full border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="h-10 w-full border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <input required type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary Password" className="h-10 w-full border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="h-10 w-full border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 border-2 px-3 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>Cancel</button><button disabled={isPending} className="h-9 border-2 px-3 text-xs font-bold uppercase" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>Create</button></div>
  </form></ModalFrame>;
}

function operatorInitials(companyName: string) {
  const parts = companyName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return companyName.slice(0, 2).toUpperCase() || "OP";
}

function OperatorDetailModal({
  operatorRow,
  buses,
  onClose,
  isPending,
  startTransition,
  router,
}: {
  operatorRow: OperatorRow;
  buses: BusType[];
  onClose: () => void;
  isPending: boolean;
  startTransition: (fn: () => void) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const { operator, user } = operatorRow;
  const [companyName, setCompanyName] = useState(operator.companyName);
  const [phone, setPhone] = useState(operator.phone ?? "");
  const [approved, setApproved] = useState(operator.approved);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const created = new Date(user.createdAt);
  const busListInner = (
    <div className="space-y-2 pr-2">
      {buses.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No buses registered yet.
        </p>
      ) : (
        buses.map((b) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-b-0"
            style={{ borderColor: "var(--border-default)" }}
          >
            <span
              className="border-2 px-2 py-0.5 text-[10px] font-black"
              style={{
                background: "var(--cta-bg)",
                borderColor: "var(--text-primary)",
                color: "var(--text-primary)",
              }}
            >
              {b.number}
            </span>
            <span
              className="min-w-0 flex-1 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {b.origin} → {b.destination}
            </span>
            <StatusBadge status={b.status} />
            <Link
              href={`/bus/${b.id}`}
              className="text-xs font-bold uppercase"
              style={{ color: "var(--color-teal)" }}
            >
              View →
            </Link>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="z-50 max-h-[90vh] w-full max-w-2xl overflow-y-auto border-2 p-5"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--text-primary)",
          boxShadow: "4px 4px 0 var(--text-primary)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <p
            className="text-2xl font-extrabold uppercase"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--text-primary)",
            }}
          >
            OPERATOR DETAILS
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 border-2 text-xs font-black"
            style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}
          >
            ✕
          </button>
        </div>

        {/* Section 1 */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center border-2 text-2xl font-black text-white"
            style={{
              background: "var(--text-primary)",
              borderColor: "var(--text-primary)",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}
          >
            {operatorInitials(operator.companyName)}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h2
              className="text-3xl font-extrabold uppercase leading-tight"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {operator.companyName}
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {user.email ?? "—"}
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {operator.phone?.trim()
                ? operator.phone
                : "No phone on record"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={operator.approved ? "approved" : "pending"} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Account created: {created.toLocaleDateString()}
              </span>
            </div>
            {user.mustChangePassword && (
              <p
                className="text-sm font-bold"
                style={{ color: "var(--color-amber)" }}
              >
                ⚠ Must change password
              </p>
            )}
          </div>
        </section>

        <div
          className="my-6 border-t-2 border-dashed"
          style={{ borderColor: "var(--border-default)" }}
        />

        {/* Section 2 */}
        <section>
          <p
            className="mb-3 text-lg font-extrabold uppercase"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--text-primary)",
            }}
          >
            Their buses
          </p>
          {buses.length > 3 ? (
            <ScrollArea
              className="h-64 rounded-md border-2 p-3"
              style={{ borderColor: "var(--border-default)" }}
            >
              {busListInner}
            </ScrollArea>
          ) : (
            <div className="rounded-md border-2 p-3" style={{ borderColor: "var(--border-default)" }}>
              {busListInner}
            </div>
          )}
        </section>

        <div
          className="my-6 border-t-2 border-dashed"
          style={{ borderColor: "var(--border-default)" }}
        />

        {/* Section 3 */}
        <section className="space-y-4">
          <p
            className="text-lg font-extrabold uppercase"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--text-primary)",
            }}
          >
            Edit operator details
          </p>
          <div className="grid gap-3">
            <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Company name
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 h-11 w-full border-2 px-3 text-sm"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Phone
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 h-11 w-full border-2 px-3 text-sm"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setApproved(true)}
                className="h-10 border-2 px-4 text-xs font-bold uppercase"
                style={{
                  background: approved ? "var(--cta-bg)" : "var(--bg-surface-2)",
                  borderColor: "var(--text-primary)",
                  color: "var(--text-primary)",
                }}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setApproved(false)}
                className="h-10 border-2 px-4 text-xs font-bold uppercase"
                style={{
                  background: !approved ? "var(--status-stopped-bg)" : "var(--bg-surface-2)",
                  borderColor: "var(--text-primary)",
                  color: "var(--text-primary)",
                }}
              >
                Revoke
              </button>
            </div>
            <button
              type="button"
              disabled={isPending}
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
                    onClose();
                  } else toast.error(r.error ?? "Failed");
                })
              }
              className="h-11 w-full border-2 text-sm font-bold uppercase"
              style={{
                background: "var(--cta-bg)",
                borderColor: "var(--text-primary)",
                color: "var(--text-primary)",
                boxShadow: "3px 3px 0 var(--text-primary)",
              }}
            >
              Save changes
            </button>
          </div>

          <div
            className="my-6 border-t-4 border-dashed"
            style={{ borderColor: "var(--status-stopped-text)" }}
          />
          <p
            className="text-center text-xs font-black uppercase tracking-widest"
            style={{ color: "var(--status-stopped-text)" }}
          >
            Danger zone
          </p>

          <div
            className="mt-4 space-y-3 border-2 p-4"
            style={{ borderColor: "var(--status-stopped-text)" }}
          >
            <p className="text-sm font-bold uppercase" style={{ color: "var(--status-stopped-text)" }}>
              Delete operator account
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              This permanently removes the operator, their account, and dissociates their buses. This cannot be undone.
            </p>
            <label className="block text-xs font-bold uppercase" style={{ color: "var(--text-muted)" }}>
              Type the company name to confirm:
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="mt-1 h-11 w-full border-2 px-3 text-sm"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              />
            </label>
            <button
              type="button"
              disabled={isPending || deleteConfirm !== operator.companyName}
              onClick={() =>
                startTransition(async () => {
                  const r = await deleteOperatorAction(operator.id);
                  if (r.success) {
                    toast.success("Operator removed");
                    onClose();
                    router.refresh();
                  } else toast.error(r.error ?? "Failed");
                })
              }
              className="h-11 w-full border-2 text-sm font-bold uppercase text-white disabled:opacity-40"
              style={{
                background: "var(--destructive)",
                borderColor: "rgb(153 27 27)",
                boxShadow: "3px 3px 0 rgb(153 27 27)",
              }}
            >
              Delete operator
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ImportPreviewModal({ data, onClose, onConfirm, isPending }: { data: Stop[]; onClose: () => void; onConfirm: () => void; isPending: boolean }) {
  return <ModalFrame title="IMPORT STOPS PREVIEW" onClose={onClose}><p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>{data.length} stops found in file</p><div className="mt-2 max-h-72 overflow-y-auto border-2" style={{ borderColor: "var(--border-default)" }}><table className="w-full text-xs"><thead><tr><th>#</th><th>ID</th><th>Name</th><th>Lat</th><th>Lng</th></tr></thead><tbody>{data.map((s, i) => <tr key={`${s.id}-${i}`}><td>{i + 1}</td><td>{s.id}</td><td>{s.name}</td><td>{s.lat}</td><td>{s.lng}</td></tr>)}</tbody></table></div><p className="mt-2 text-xs" style={{ color: "var(--status-delayed-text)" }}>Existing stops with the same ID will be overwritten</p><div className="mt-3 flex justify-end gap-2"><button onClick={onClose} className="h-9 border-2 px-3 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>Cancel</button><button disabled={isPending} onClick={onConfirm} className="h-9 border-2 px-3 text-xs font-bold uppercase" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>CONFIRM IMPORT ({data.length} stops)</button></div></ModalFrame>;
}

function AdminAddBusModal({ operators, stops, onClose, onSubmit, isPending }: { operators: OperatorRow[]; stops: Stop[]; onClose: () => void; onSubmit: (data: { number: string; operatorId: string; licensePlate: string; origin: string; destination: string; fullFare: number; driverName: string; conductorName: string; totalSeats: number; schedule: string[]; womenReservedTotal: number; studentCardAccepted: boolean; studentDiscountPercent: number; routeStopIds: string[] }) => void; isPending: boolean }) {
  const [number, setNumber] = useState(""); const [operatorId, setOperatorId] = useState(operators[0]?.operator.id ?? ""); const [licensePlate, setLicensePlate] = useState(""); const [origin, setOrigin] = useState(""); const [destination, setDestination] = useState(""); const [fullFare, setFullFare] = useState(""); const [driverName, setDriverName] = useState(""); const [conductorName, setConductorName] = useState(""); const [totalSeats, setTotalSeats] = useState(""); const [womenReservedTotal, setWomenReservedTotal] = useState("0"); const [studentCardAccepted, setStudentCardAccepted] = useState(false); const [studentDiscountPercent, setStudentDiscountPercent] = useState("0"); const [scheduleRaw, setScheduleRaw] = useState(""); const [routeStopIds, setRouteStopIds] = useState<string[]>([]);
  return <ModalFrame title="ADD BUS" onClose={onClose}><form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); onSubmit({ number, operatorId, licensePlate, origin, destination, fullFare: Number(fullFare), driverName, conductorName, totalSeats: Number(totalSeats), schedule: scheduleRaw.split(",").map((s) => s.trim()).filter(Boolean), womenReservedTotal: Number(womenReservedTotal), studentCardAccepted, studentDiscountPercent: Number(studentDiscountPercent), routeStopIds }); }}>
    <input required value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Bus Number" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)} className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }}>{operators.map(({ operator }) => <option key={operator.id} value={operator.id}>{operator.companyName}</option>)}</select>
    <input required value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="License Plate" className="h-10 border-2 px-2 text-sm md:col-span-2" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <input required value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Origin" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <input required value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <input required type="number" value={fullFare} onChange={(e) => setFullFare(e.target.value)} placeholder="Full Fare" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <input required type="number" value={totalSeats} onChange={(e) => setTotalSeats(e.target.value)} placeholder="Total Seats" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <input required value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver Name" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <input required value={conductorName} onChange={(e) => setConductorName(e.target.value)} placeholder="Conductor Name" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <input value={womenReservedTotal} onChange={(e) => setWomenReservedTotal(e.target.value)} type="number" placeholder="Women Reserved Seats" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <input value={studentDiscountPercent} onChange={(e) => setStudentDiscountPercent(e.target.value)} type="number" placeholder="Student Discount %" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <label className="md:col-span-2 text-xs"><input type="checkbox" checked={studentCardAccepted} onChange={(e) => setStudentCardAccepted(e.target.checked)} /> Student card accepted</label>
    <input value={scheduleRaw} onChange={(e) => setScheduleRaw(e.target.value)} placeholder="Schedule comma-separated" className="h-10 border-2 px-2 text-sm md:col-span-2" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
    <div className="md:col-span-2"><StopBuilder stops={stops} value={routeStopIds} onChange={setRouteStopIds} /></div>
    <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 border-2 px-3 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>Cancel</button><button disabled={isPending} className="h-9 border-2 px-3 text-xs font-bold uppercase" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>Add Bus</button></div>
  </form></ModalFrame>;
}
