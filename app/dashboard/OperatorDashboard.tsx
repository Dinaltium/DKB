"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { StopBuilder } from "@/app/components/StopBuilder";
import { StatusBadge } from "@/app/components/ui/StatusBadge";
import {
  resolveComplaintAction,
  submitBusRequestAction,
  updateBusStatusAction,
} from "@/lib/actions/bus";
import type { Bus as BusType, BusRequest, Complaint, Operator, Payment, Stop } from "@/lib/db/schema";

interface Props {
  operator: Operator;
  buses: BusType[];
  complaints: Complaint[];
  payments: Payment[];
  busRequests: BusRequest[];
  stops: Stop[];
}

export function OperatorDashboard({ operator, buses, complaints, payments, busRequests, stops }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="border-2 p-4" style={{ borderColor: "var(--text-primary)", background: "var(--bg-surface)" }}>
        <p className="text-2xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}>{operator.companyName}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Buses: {buses.length} • Payments: {payments.length} • Complaints: {complaints.length}</p>
      </div>

      <button onClick={() => setOpen(true)} className="h-10 border-2 px-4 text-xs font-bold uppercase" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>
        + REQUEST BUS REGISTRATION
      </button>

      {buses.map((bus) => (
        <article key={bus.id} className="border-2 p-3" style={{ borderColor: "var(--text-primary)", background: "var(--bg-surface)" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}>{bus.number}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{bus.origin} → {bus.destination}</p>
              <StatusBadge status={bus.status} />
            </div>
            <div className="flex gap-2">
              <select defaultValue={bus.status} onChange={(e) => startTransition(async () => { const r = await updateBusStatusAction(bus.id, e.target.value as BusType["status"]); r.success ? toast.success("Status updated") : toast.error(r.error ?? "Failed"); })} className="h-9 border-2 px-2 text-xs" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }}>
                <option>Running</option><option>Not Running</option><option>Delayed</option>
              </select>
              <Link href={`/bus/${bus.id}`} className="inline-flex h-9 items-center border-2 px-3 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>VIEW</Link>
            </div>
          </div>
        </article>
      ))}

      {busRequests.map((req) => (
        <article key={req.id} className="border-2 p-3" style={{ borderColor: "var(--text-primary)", background: "var(--bg-surface)" }}>
          <p className="font-bold" style={{ color: "var(--text-primary)" }}>{req.number}</p>
          <StatusBadge status={req.status} />
        </article>
      ))}

      {complaints.map((c) => (
        <article key={c.id} className="border-2 p-3" style={{ borderColor: "var(--text-primary)", background: "var(--bg-surface)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{c.busNumber} • {c.category}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.description}</p>
          {c.status === "pending" && (
            <button onClick={() => startTransition(async () => { const r = await resolveComplaintAction(c.id); r.success ? toast.success("Complaint resolved") : toast.error(r.error ?? "Failed"); })} className="mt-2 h-8 border-2 px-2 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>
              RESOLVE
            </button>
          )}
        </article>
      ))}

      {open && <OperatorBusRequestModal stops={stops} onClose={() => setOpen(false)} isPending={isPending} onSubmit={(data) => startTransition(async () => { const r = await submitBusRequestAction(data); r.success ? (toast.success("Bus registration request submitted"), setOpen(false)) : toast.error(r.error ?? "Failed"); })} />}
    </div>
  );
}

function OperatorBusRequestModal({ stops, onClose, onSubmit, isPending }: { stops: Stop[]; onClose: () => void; onSubmit: (data: { number: string; licensePlate: string; origin: string; destination: string; fullFare: number; driverName: string; conductorName: string; totalSeats: number; schedule: string[]; womenReservedTotal: number; studentCardAccepted: boolean; studentDiscountPercent: number; routeStopIds: string[]; operatorAadhaar?: string; operatorLicense?: string; rcNumber?: string; pollutionCertNumber?: string; insurancePolicyNumber?: string }) => void; isPending: boolean }) {
  const [number, setNumber] = useState(""); const [licensePlate, setLicensePlate] = useState(""); const [origin, setOrigin] = useState(""); const [destination, setDestination] = useState(""); const [fullFare, setFullFare] = useState(""); const [driverName, setDriverName] = useState(""); const [conductorName, setConductorName] = useState(""); const [totalSeats, setTotalSeats] = useState(""); const [scheduleRaw, setScheduleRaw] = useState(""); const [routeStopIds, setRouteStopIds] = useState<string[]>([]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 z-40 bg-black/60" />
      <div className="z-50 max-h-[90vh] w-full max-w-2xl overflow-y-auto border-2 p-4" style={{ background: "var(--bg-surface)", borderColor: "var(--text-primary)", boxShadow: "4px 4px 0 var(--text-primary)" }}>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-2xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}>
            REQUEST BUS REGISTRATION
          </p>
          <button onClick={onClose} className="h-8 w-8 border-2 text-xs font-black" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>✕</button>
        </div>
        <p className="mt-1 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
          Changes will be lost if you close
        </p>
        <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            number, licensePlate, origin, destination, fullFare: Number(fullFare),
            driverName, conductorName, totalSeats: Number(totalSeats),
            schedule: scheduleRaw.split(",").map((s) => s.trim()).filter(Boolean),
            womenReservedTotal: 0, studentCardAccepted: false, studentDiscountPercent: 0, routeStopIds,
          });
        }}>
          <input required value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Bus Number" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
          <input required value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="License Plate" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
          <input required value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Origin" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
          <input required value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
          <input required type="number" value={fullFare} onChange={(e) => setFullFare(e.target.value)} placeholder="Full Fare" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
          <input required type="number" value={totalSeats} onChange={(e) => setTotalSeats(e.target.value)} placeholder="Total Seats" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
          <input required value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver Name" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
          <input required value={conductorName} onChange={(e) => setConductorName(e.target.value)} placeholder="Conductor Name" className="h-10 border-2 px-2 text-sm" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
          <input value={scheduleRaw} onChange={(e) => setScheduleRaw(e.target.value)} placeholder="Schedule (comma separated)" className="h-10 border-2 px-2 text-sm md:col-span-2" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
          <div className="md:col-span-2"><StopBuilder stops={stops} value={routeStopIds} onChange={setRouteStopIds} /></div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-9 border-2 px-3 text-xs font-bold uppercase" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>Cancel</button>
            <button disabled={isPending} className="h-9 border-2 px-3 text-xs font-bold uppercase" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}
