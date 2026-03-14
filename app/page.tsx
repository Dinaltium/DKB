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
      <section className="grid gap-6 rounded-xl border-2 border-slate-200 bg-white p-4 md:grid-cols-2 md:gap-10 md:p-8">
        <div className="space-y-6">
          <h2 className="text-base font-semibold uppercase tracking-[0.14em] text-[#0E7C86] md:text-lg">
            {tr("heroMvpLabel")}
          </h2>
          <p className="text-sm leading-relaxed text-slate-700 md:text-base">
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
              className="inline-flex h-11 items-center rounded-none border-2 border-[#0D1B2A] bg-white px-5 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-slate-100"
            >
              {tr("scanQr")}
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border-2 border-slate-200">
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
            className="surface-card rounded-lg border-2 border-slate-200 bg-white p-5"
          >
            <p
              className="text-5xl font-extrabold text-[#0D1B2A]"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {item.value}
            </p>
            <p className="mt-2 text-sm text-slate-700">{item.text}</p>
          </article>
        ))}
      </section>

      {/* ── Live Bus Tracker ── */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-3">
          <h2
            className="text-xl font-extrabold uppercase tracking-wide text-[#0D1B2A]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {tr("liveNow")}
          </h2>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            LIVE
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {BUSES.map((bus) => {
            const pos = getPosition(bus.id);
            return (
              <Link key={bus.id} href={`/bus/${bus.id}`} className="block">
                <article className="surface-card h-full rounded-lg border-2 border-slate-200 bg-white p-5 transition-colors hover:border-[#0D1B2A]">
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="rounded-sm bg-[#0D1B2A] px-2 py-0.5 text-sm font-bold text-[#F4A522]"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      {bus.number}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        bus.status === "Running"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : bus.status === "Delayed"
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-rose-300 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {bus.status}
                    </span>
                  </div>

                  {/* Route */}
                  <p className="mt-2 text-sm font-semibold text-[#0D1B2A]">
                    {bus.origin} <span className="text-[#0E7C86]">→</span>{" "}
                    {bus.destination}
                  </p>

                  {/* Live segment */}
                  {pos ? (
                    <>
                      <div className="mt-3 rounded-md border border-teal-100 bg-teal-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-600">
                          Now between
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-[#0D1B2A]">
                          {pos.fromStop}{" "}
                          <span className="text-[#0E7C86]">→</span> {pos.toStop}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#0E7C86] transition-all duration-[1500ms] ease-in-out"
                            style={{ width: `${Math.round(pos.progressPct)}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                          <span>{bus.origin}</span>
                          <span>{Math.round(pos.progressPct)}%</span>
                          <span>{bus.destination}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">
                      Locating bus...
                    </p>
                  )}

                  {/* Track CTA */}
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#0D1B2A]">
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
