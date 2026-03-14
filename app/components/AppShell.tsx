"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bus, ShieldCheck, UserCog } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const { language, setLanguage, tr } = useLanguage();

  const navItems = [
    { to: "/search", label: tr("routeSearch"), icon: Bus },
    { to: "/operator", label: tr("operator"), icon: UserCog },
    { to: "/admin", label: tr("admin"), icon: ShieldCheck },
  ];

  return (
    <div className="buslink-page">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <Link
              href="/"
              className="font-barlow text-3xl uppercase tracking-wide text-[#0D1B2A]"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
              }}
            >
              {tr("brand")}
            </Link>
            <p className="text-xs text-slate-500 md:text-sm">
              {subtitle ?? tr("tagline")}
            </p>
          </div>

          {/* Language switcher */}
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
              className="h-10 rounded border-2 border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 md:px-8 md:pt-12">
        <div className="mb-8 md:mb-10">
          <h1
            className="text-4xl font-extrabold uppercase text-[#0D1B2A] sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {title}
          </h1>
        </div>
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t-4 border-[#F4A522] bg-[#0D1B2A] px-2 text-white md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              href={item.to}
              className={`flex min-w-[70px] flex-col items-center gap-1 rounded-md px-2 py-1 text-xs ${
                isActive ? "bg-[#F4A522] text-[#0D1B2A]" : "text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Desktop floating nav ── */}
      <div className="fixed bottom-5 right-4 hidden gap-2 md:flex">
        {navItems.map((item) => (
          <Link
            key={item.to}
            href={item.to}
            className="rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-amber-400"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
