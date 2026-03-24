"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Bus, MapPin, Users, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useLanguage } from "@/app/context/LanguageContext";
import { useLiveBus } from "@/app/context/LiveBusContext";
import type { PlatformStats } from "@/app/api/stats/route";

const FleetMap = dynamic(() => import("@/components/maps/FleetMap"), {
  ssr: false,
});

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="h-52 animate-pulse rounded-none border-2"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border-default)",
      }}
    />
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
interface StatTileProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  loading?: boolean;
}

function StatTile({ label, value, icon, loading }: StatTileProps) {
  return (
    <div
      className="flex items-center gap-4 rounded-none border-2 p-5 shadow-[4px_4px_0_hsl(var(--foreground))]"
      style={{
        background: "var(--bg-surface)",
      }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none border-2"
        style={{
          background: "var(--bg-surface-2)",
          color: "#0E7C86",
        }}
      >
        {icon}
      </div>
      <div>
        <p
          className="text-3xl font-extrabold leading-none"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            color: "var(--text-primary)",
          }}
        >
          {loading ? (
            <span
              className="inline-block h-7 w-12 animate-pulse rounded-none"
              style={{ background: "var(--bg-surface-3)" }}
            />
          ) : (
            value
          )}
        </p>
        <p
          className="mt-0.5 text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { tr } = useLanguage();
  const { getPosition, buses } = useLiveBus();

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data: PlatformStats) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <AppShell title={tr("tagline")} subtitle={tr("corridorSubtitle")}>
      {/* ── Hero ── */}
      <section
        className="grid gap-6 rounded-none border-2 p-5 shadow-[4px_4px_0_hsl(var(--foreground))] md:grid-cols-2 md:gap-10 md:p-8"
        style={{
          background: "var(--bg-surface)",
        }}
      >
        <div className="flex flex-col justify-center space-y-5">
          <p
            className="text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: "#0E7C86" }}
          >
            {tr("heroMvpLabel")}
          </p>
          <p
            className="text-sm leading-relaxed md:text-base"
            style={{ color: "var(--text-secondary)" }}
          >
            {tr("heroDesc")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/search"
              className="inline-flex h-11 items-center rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:opacity-80"
            >
              {tr("searchRoute")}
            </Link>
            {buses.length > 0 && (
              <Link
                href={`/bus/${buses[0].id}`}
                className="inline-flex h-11 items-center rounded-none border-2 px-5 text-sm font-bold uppercase tracking-wide shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:opacity-80"
                style={{
                  background: "var(--bg-surface-2)",
                  color: "var(--text-primary)",
                }}
              >
                {tr("scanQr")}
              </Link>
            )}
          </div>
        </div>

        {/* Hero image — full bleed on the right column */}
        <div
          className="overflow-hidden rounded-none border-2 shadow-[4px_4px_0_hsl(var(--foreground))]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1769243181811-56bfd58b2918?auto=format&fit=crop&w=1200&q=80"
            alt="Coastal Karnataka bus route"
            className="aspect-[4/3] w-full object-cover object-center"
            loading="lazy"
          />
        </div>
      </section>

      {/* ── Platform stats (from DB) ── */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatTile
          label="Active Buses"
          value={stats?.totalBuses ?? 0}
          icon={<Bus className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatTile
          label="Stops"
          value={stats?.totalStops ?? 0}
          icon={<MapPin className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatTile
          label="Operators"
          value={stats?.approvedOperators ?? 0}
          icon={<Users className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatTile
          label="Open Complaints"
          value={stats?.pendingComplaints ?? 0}
          icon={<AlertCircle className="h-5 w-5" />}
          loading={statsLoading}
        />
      </section>

      {/* ── Fleet Map ── */}
      <section className="mt-10">
        <div className="mb-3 flex items-center gap-3">
          <h2
            className="text-xl font-extrabold uppercase tracking-wide"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--text-primary)",
            }}
          >
            ALL BUS LOCATIONS
          </h2>
        </div>
        <FleetMap />
      </section>

      {/* ── Live Bus Cards ── */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-3">
          <h2
            className="text-xl font-extrabold uppercase tracking-wide"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: "var(--text-primary)",
            }}
          >
            {tr("liveNow")}
          </h2>
        </div>

        {/* Loading skeleton */}
        {buses.length === 0 && statsLoading && (
          <div className="grid gap-4 md:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Empty state — data loaded but no buses in DB */}
        {buses.length === 0 && !statsLoading && (
          <EmptyState
            title="No buses running"
            description="No buses have been added to the platform yet. Operators can add buses from their dashboard."
            action={
              <Link
                href="/auth"
                className="inline-flex h-10 items-center rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-5 text-xs font-bold uppercase tracking-wide text-[#0D1B2A] shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:opacity-80"
              >
                Operator Login
              </Link>
            }
          />
        )}

        {/* Bus cards */}
        {buses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {buses.map((bus) => {
              const pos = getPosition(bus.id);
              return (
                <Link key={bus.id} href={`/bus/${bus.id}`} className="block">
                  <article
                    className="h-full rounded-none border-2 p-5 shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:opacity-100"
                    style={{
                      background: "var(--bg-surface)",
                      borderColor: "var(--border-default)",
                    }}
                  >
                    {/* Bus number + status */}
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="rounded-none border-2 border-[#F4A522] px-2 py-0.5 text-sm font-black uppercase tracking-wide text-[#F4A522]"
                        style={{
                          fontFamily: "'Barlow Condensed', sans-serif",
                          background: "var(--color-navy, #0D1B2A)",
                        }}
                      >
                        {bus.number}
                      </span>
                      <StatusBadge
                        status={
                          bus.status as "Running" | "Not Running" | "Delayed"
                        }
                      />
                    </div>

                    {/* Route */}
                    <p
                      className="mt-2 text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {bus.origin}{" "}
                      <span className="text-[#0E7C86]">&#8594;</span>{" "}
                      {bus.destination}
                    </p>

                    {/* Live position */}
                    {pos ? (
                      <>
                        <div
                          className="mt-3 rounded-none border-2 px-3 py-2"
                          style={{
                            background: "var(--bg-surface-2)",
                            borderColor: "var(--border-default)",
                          }}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0E7C86]">
                            Now between
                          </p>
                          <p
                            className="mt-0.5 text-xs font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {pos.fromStop}{" "}
                            <span className="text-[#0E7C86]">&#8594;</span>{" "}
                            {pos.toStop}
                          </p>
                        </div>
                        <div className="mt-3">
                          <div
                            className="h-2 w-full overflow-hidden rounded-none border-2 border-foreground"
                            style={{ background: "var(--bg-surface-3)" }}
                          >
                            <div
                              className="h-full rounded-none bg-[#0E7C86] transition-all duration-[1500ms] ease-in-out"
                              style={{
                                width: `${Math.round(pos.progressPct)}%`,
                              }}
                            />
                          </div>
                          <div
                            className="mt-1 flex justify-between text-[10px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <span>{bus.origin}</span>
                            <span>{Math.round(pos.progressPct)}%</span>
                            <span>{bus.destination}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p
                        className="mt-3 text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Locating bus...
                      </p>
                    )}

                    <p
                      className="mt-4 text-xs font-bold uppercase tracking-widest"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {tr("track")} &#8594;
                    </p>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
