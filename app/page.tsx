"use client";

import Link from "next/link";
import { AppShell } from "@/app/components/AppShell";
import { useLanguage } from "@/app/context/LanguageContext";
import { useLiveBus } from "@/app/context/LiveBusContext";
import { BUSES } from "@/lib/data";

const PROBLEM_STAT_VALUES = ["47%", "0", "68%"] as const;

export default function LandingPage() {
  const { tr } = useLanguage();
  const { getPosition } = useLiveBus();

  const problemStats = [
    { value: PROBLEM_STAT_VALUES[0], text: tr("stat1") },
    { value: PROBLEM_STAT_VALUES[1], text: tr("stat2") },
    { value: PROBLEM_STAT_VALUES[2], text: tr("stat3") },
  ];

  return (
    <AppShell title={tr("tagline")} subtitle={tr("corridorSubtitle")}>
      {/* ── Hero ── */}
      <section
        className="grid gap-6 rounded-xl border-2 p-4 md:grid-cols-2 md:gap-10 md:p-8"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
      >
        <div className="space-y-6">
          <h2 className="text-base font-semibold uppercase tracking-[0.14em] text-[#0E7C86] md:text-lg">
            {tr("heroMvpLabel")}
          </h2>
          <p className="text-sm leading-relaxed md:text-base" style={{ color: "var(--text-secondary)" }}>
            {tr("heroDesc")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/search"
              className="inline-flex h-11 items-center rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-amber-400"
            >
              {tr("searchRoute")}
            </Link>
            <Link
              href="/bus/MNG-101"
              className="inline-flex h-11 items-center rounded-none border-2 px-5 text-sm font-bold uppercase tracking-wide hover:opacity-80"
              style={{
                background: "var(--bg-surface-2)",
                borderColor: "var(--border-medium)",
                color: "var(--text-primary)",
              }}
            >
              {tr("scanQr")}
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border-2" style={{ borderColor: "var(--border-default)" }}>
          <img
            src="https://images.unsplash.com/photo-1769243181811-56bfd58b2918?auto=format&fit=crop&w=1200&q=80"
            alt="Coastal Karnataka bus route"
            className="aspect-[4/3] w-full object-cover object-center"
            loading="lazy"
          />
        </div>
      </section>

      {/* ── Problem stats ── */}
      <section className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
        {problemStats.map((item, i) => (
          <article
            key={i}
            className="surface-card rounded-lg border-2 p-5"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
          >
            <p
              className="text-5xl font-extrabold"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
            >
              {item.value}
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>{item.text}</p>
          </article>
        ))}
      </section>

      {/* ── Live Bus Tracker ── */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-3">
          <h2
            className="text-xl font-extrabold uppercase tracking-wide"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
          >
            {tr("liveNow")}
          </h2>
          <span
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
            style={{
              background: "var(--status-running-bg)",
              color: "var(--status-running-text)",
              borderColor: "var(--status-running-border)",
            }}
          >
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            LIVE
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {BUSES.map((bus) => {
            const pos = getPosition(bus.id);
            return (
              <Link key={bus.id} href={`/bus/${bus.id}`} className="block">
                <article
                  className="surface-card h-full rounded-lg border-2 p-5 transition-colors"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="rounded-sm px-2 py-0.5 text-sm font-bold text-[#F4A522]"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif", background: "var(--color-navy)" }}
                    >
                      {bus.number}
                    </span>
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                      style={
                        bus.status === "Running"
                          ? { background: "var(--status-running-bg)", color: "var(--status-running-text)", borderColor: "var(--status-running-border)" }
                          : bus.status === "Delayed"
                          ? { background: "var(--status-delayed-bg)", color: "var(--status-delayed-text)", borderColor: "var(--status-delayed-border)" }
                          : { background: "var(--status-stopped-bg)", color: "var(--status-stopped-text)", borderColor: "var(--status-stopped-border)" }
                      }
                    >
                      {bus.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {bus.origin} <span className="text-[#0E7C86]">→</span> {bus.destination}
                  </p>

                  {pos ? (
                    <>
                      <div
                        className="mt-3 rounded-md border px-3 py-2"
                        style={{
                          background: "var(--bg-surface-2)",
                          borderColor: "var(--border-default)",
                        }}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0E7C86]">Now between</p>
                        <p className="mt-0.5 text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                          {pos.fromStop} <span className="text-[#0E7C86]">→</span> {pos.toStop}
                        </p>
                      </div>
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-surface-3)" }}>
                          <div
                            className="h-full rounded-full bg-[#0E7C86] transition-all duration-[1500ms] ease-in-out"
                            style={{ width: `${Math.round(pos.progressPct)}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
                          <span>{bus.origin}</span>
                          <span>{Math.round(pos.progressPct)}%</span>
                          <span>{bus.destination}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>Locating bus...</p>
                  )}

                  <p className="mt-4 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-primary)" }}>
                    {tr("track")} →
                  </p>
                </article>
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}