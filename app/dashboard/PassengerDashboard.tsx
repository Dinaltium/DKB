"use client";

import Link from "next/link";
import { MapPin, Star, Receipt, Clock } from "lucide-react";
import type { TravelHistory, LoyaltyAccount, Payment } from "@/lib/db/schema";

interface Props {
  travelHistory: TravelHistory[];
  loyalty:       LoyaltyAccount | null;
  payments:      Payment[];
  user:          { name?: string | null; email?: string | null; image?: string | null };
}

export function PassengerDashboard({ travelHistory, loyalty, payments, user }: Props) {
  const cardStyle = { background: "var(--bg-surface)", borderColor: "var(--border-default)" };

  const totalSpent = payments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0);

  const overchargedTrips = travelHistory.filter(
    (t) => (t.overchargeDelta ?? 0) > 0,
  );

  return (
    <div className="space-y-8">
      {/* ── Stats row ── */}
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<Clock className="h-5 w-5 text-[#0E7C86]" />}
          label="Total Trips"
          value={loyalty?.totalTrips ?? 0}
        />
        <StatCard
          icon={<Star className="h-5 w-5 text-[#F4A522]" />}
          label="Loyalty Points"
          value={loyalty?.totalPoints ?? 0}
        />
        <StatCard
          icon={<Receipt className="h-5 w-5 text-[#0E7C86]" />}
          label="Total Spent"
          value={`₹${totalSpent}`}
        />
        <StatCard
          icon={<MapPin className="h-5 w-5 text-red-500" />}
          label="Overcharge Alerts"
          value={overchargedTrips.length}
          alert={overchargedTrips.length > 0}
        />
      </section>

      {/* ── Travel history ── */}
      <section>
        <h2
          className="mb-4 text-xl font-extrabold uppercase tracking-wide"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
        >
          Travel History
        </h2>

        {travelHistory.length === 0 ? (
          <div className="ticket-stub rounded-lg p-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No trips recorded yet. Scan a ticket with the mobile app to log your first journey.
            </p>
            <Link
              href="/search"
              className="mt-4 inline-flex h-10 items-center border-2 border-[#0D1B2A] bg-[#F4A522] px-5 text-xs font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-amber-400"
            >
              Search a Route
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {travelHistory.map((trip) => {
              const overcharged = (trip.overchargeDelta ?? 0) > 0;
              return (
                <article
                  key={trip.id}
                  className="rounded-lg border-2 p-4"
                  style={cardStyle}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className="text-2xl font-extrabold"
                        style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
                      >
                        {trip.busNumber ?? "Unknown Bus"}
                      </p>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {trip.fromStop} → {trip.toStop}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        {trip.travelDate
                          ? new Date(trip.travelDate).toLocaleDateString("en-IN", { dateStyle: "medium" })
                          : new Date(trip.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-[#0E7C86]">₹{trip.scannedFare}</p>
                      {overcharged && (
                        <span
                          className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            background:  "var(--status-stopped-bg)",
                            color:       "var(--status-stopped-text)",
                            borderColor: "var(--status-stopped-border)",
                          }}
                        >
                          +₹{trip.overchargeDelta} overcharged
                        </span>
                      )}
                      {(trip.loyaltyPoints ?? 0) > 0 && (
                        <p className="mt-1 text-[10px] font-semibold text-[#F4A522]">
                          +{trip.loyaltyPoints} pts
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Payment history ── */}
      {payments.length > 0 && (
        <section>
          <h2
            className="mb-4 text-xl font-extrabold uppercase tracking-wide"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
          >
            Payment History
          </h2>
          <div className="space-y-2">
            {payments.slice(0, 10).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
                style={cardStyle}
              >
                <div>
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    Bus {p.busNumber}
                  </span>
                  <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(p.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#0E7C86]">₹{p.amount}</span>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                    style={
                      p.status === "success"
                        ? { background: "var(--status-running-bg)", color: "var(--status-running-text)", borderColor: "var(--status-running-border)" }
                        : { background: "var(--status-stopped-bg)", color: "var(--status-stopped-text)", borderColor: "var(--status-stopped-border)" }
                    }
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div
      className="rounded-lg border-2 p-5"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
      </div>
      <p
        className={`mt-2 text-4xl font-extrabold ${alert ? "text-red-500" : "text-[#0E7C86]"}`}
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
}