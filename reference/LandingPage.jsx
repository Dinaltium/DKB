import { Link } from "react-router-dom";
import { AlertTriangle, CircleDollarSign, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { useLanguage } from "@/context/LanguageContext";

const problemStats = [
  { title: "47%", text: "Commuters report fare mismatch or overcharging" },
  { title: "0", text: "Official digital route info tools on this corridor" },
  { title: "68%", text: "Passengers say complaints are never tracked" },
];

export const LandingPage = () => {
  const { tr } = useLanguage();

  return (
    <AppShell title={tr("tagline")} subtitle="Private bus corridor support for Mangalore ↔ Udupi">
      <section data-testid="landing-hero-section" className="grid gap-6 rounded-xl border-2 border-slate-200 bg-white p-4 md:grid-cols-2 md:gap-10 md:p-8">
        <div className="space-y-6">
          <h2 data-testid="landing-hero-heading" className="text-base font-semibold uppercase tracking-[0.14em] text-[#0E7C86] md:text-lg">
            BusConnect Corridor MVP
          </h2>
          <p data-testid="landing-hero-description" className="text-sm leading-relaxed text-slate-700 md:text-base">
            Search buses instantly, scan QR at stop, know exact fare, and pay securely with a mobile-first experience.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              data-testid="landing-search-route-button"
              className="h-11 rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-5 font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-amber-400"
            >
              <Link to="/search">{tr("searchRoute")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              data-testid="landing-scan-qr-button"
              className="h-11 rounded-none border-2 border-[#0D1B2A] bg-white px-5 font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-slate-100"
            >
              <Link to="/bus/MNG-101">{tr("scanQr")}</Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border-2 border-slate-200">
          <img
            src="https://images.unsplash.com/photo-1769243181811-56bfd58b2918?auto=format&fit=crop&w=1200&q=80"
            alt="Coastal bus route"
            data-testid="landing-hero-image"
            className="aspect-[4/3] w-full object-cover object-center"
            loading="lazy"
          />
        </div>
      </section>

      <section data-testid="landing-problem-stats-section" className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
        {problemStats.map((item, index) => (
          <article
            key={item.title}
            data-testid={`problem-stat-card-${index}`}
            className="surface-card rounded-lg border-2 border-slate-200 bg-white p-5 transition-transform duration-300"
          >
            <p className="font-['Barlow_Condensed'] text-5xl font-extrabold text-[#0D1B2A]" data-testid={`problem-stat-value-${index}`}>
              {item.title}
            </p>
            <p className="mt-2 text-sm text-slate-700" data-testid={`problem-stat-text-${index}`}>
              {item.text}
            </p>
          </article>
        ))}
      </section>

      <section data-testid="landing-feature-flags" className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="ticket-stub rounded-lg p-4" data-testid="feature-tile-search">
          <Search className="h-5 w-5 text-[#0E7C86]" />
          <p className="mt-2 text-sm text-slate-700">Route search with fare and seat visibility</p>
        </div>
        <div className="ticket-stub rounded-lg p-4" data-testid="feature-tile-payments">
          <CircleDollarSign className="h-5 w-5 text-[#0E7C86]" />
          <p className="mt-2 text-sm text-slate-700">UPI-ready mock payment journey in 2 taps</p>
        </div>
        <div className="ticket-stub rounded-lg p-4" data-testid="feature-tile-complaints">
          <AlertTriangle className="h-5 w-5 text-[#0E7C86]" />
          <p className="mt-2 text-sm text-slate-700">Complaint logging linked to bus number</p>
        </div>
      </section>
    </AppShell>
  );
};
