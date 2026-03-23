"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BusRequestModal } from "@/components/modals/BusRequestModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
      <div className="rounded-none border-2 p-4 shadow-[4px_4px_0_hsl(var(--foreground))]" style={{ borderColor: "var(--text-primary)", background: "var(--bg-surface)" }}>
        <p className="text-2xl font-extrabold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}>{operator.companyName}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Buses: {buses.length} • Payments: {payments.length} • Complaints: {complaints.length}</p>
      </div>

      <button type="button" onClick={() => setOpen(true)} className="h-10 rounded-none border-2 px-4 text-xs font-bold uppercase shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none" style={{ background: "var(--cta-bg)", borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>
        + REQUEST BUS REGISTRATION
      </button>

      {buses.map((bus) => (
        <article key={bus.id} className="rounded-none border-2 p-3 shadow-[4px_4px_0_hsl(var(--foreground))]" style={{ borderColor: "var(--text-primary)", background: "var(--bg-surface)" }}>
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
              <Link href={`/bus/${bus.id}`} className="inline-flex h-9 items-center rounded-none border-2 px-3 text-xs font-bold uppercase shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>VIEW</Link>
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
        <article key={c.id} className="rounded-none border-2 p-3 shadow-[4px_4px_0_hsl(var(--foreground))]" style={{ borderColor: "var(--text-primary)", background: "var(--bg-surface)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{c.busNumber} • {c.category}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.description}</p>
          {c.status === "pending" && (
            <button type="button" onClick={() => startTransition(async () => { const r = await resolveComplaintAction(c.id); r.success ? toast.success("Complaint resolved") : toast.error(r.error ?? "Failed"); })} className="mt-2 h-8 rounded-none border-2 px-2 text-xs font-bold uppercase shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none" style={{ borderColor: "var(--text-primary)", color: "var(--text-primary)" }}>
              RESOLVE
            </button>
          )}
        </article>
      ))}

      {open && (
        <BusRequestModal
          stops={stops}
          onClose={() => setOpen(false)}
          isPending={isPending}
          onSubmit={(data) =>
            startTransition(async () => {
              const r = await submitBusRequestAction(data);
              if (r.success) {
                toast.success("Bus registration request submitted");
                setOpen(false);
              } else {
                toast.error(r.error ?? "Failed");
              }
            })
          }
        />
      )}
    </div>
  );
}
