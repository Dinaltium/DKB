"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  Bus, LayoutDashboard, LogIn, LogOut,
  Moon, Search, ShieldCheck, Sun, User,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/app/context/LanguageContext";
import { useTheme } from "@/app/context/ThemeContext";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";

interface AppShellProps {
  title:     string;
  subtitle?: string;
  children:  React.ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const pathname          = usePathname();
  const router            = useRouter();
  const { language, setLanguage, tr } = useLanguage();
  const { isDark, toggleTheme }       = useTheme();
  const { data: session, status }     = useSession();
  const role = session?.user?.role;

  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (role !== "admin") return;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/pending-count");
        const { count } = await res.json();
        setPendingCount(typeof count === "number" ? count : 0);
      } catch {
        setPendingCount(0);
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [role]);

  useEffect(() => {
    const user = session?.user as { mustChangePassword?: boolean } | undefined;
    if (
      user?.mustChangePassword &&
      typeof window !== "undefined" &&
      !sessionStorage.getItem("buslink-pwd-toast-shown")
    ) {
      toast.warning(
        "⚠ Please update your temporary password. You have 5 minutes (test mode) before access is blocked.",
        { duration: 10000 },
      );
      sessionStorage.setItem("buslink-pwd-toast-shown", "true");
    }
  }, [session]);

  // ── Mobile bottom nav — always visible items ───────────────────────────────
  const mobileNavItems = [
    { to: "/search", label: tr("routeSearch"), icon: Search },
    { to: "/auth",   label: "Sign In",         icon: LogIn   },
  ];

  return (
    <div className="buslink-page">
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{
          background:   "var(--header-bg)",
          borderBottom: "1px solid var(--header-border)",
        }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-8">
          {/* Brand */}
          <div className="min-w-0">
            <Link
              href="/"
              className="text-3xl uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: "var(--text-primary)" }}
            >
              {tr("brand")}
            </Link>
            <p className="text-xs md:text-sm" style={{ color: "var(--text-muted)" }}>
              {subtitle ?? tr("tagline")}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
              className="h-10 rounded border-2 px-2 text-sm focus:outline-none"
              style={{ background: "var(--select-bg)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="flex h-10 w-10 items-center justify-center rounded border-2 hover:opacity-80"
              style={{ background: isDark ? "var(--bg-surface-2)" : "var(--bg-surface)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
            >
              {isDark
                ? <Sun  className="h-4 w-4 text-amber-400" />
                : <Moon className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />}
            </button>

            {/* Auth button / user menu */}
            {status === "loading" ? (
              <div className="h-10 w-24 animate-pulse rounded border-2" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface-2)" }} />
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="relative flex h-10 items-center gap-2 rounded border-2 px-3 text-sm font-semibold hover:opacity-80"
                  style={{ background: "var(--bg-surface-2)", borderColor: "var(--input-border)", color: "var(--text-primary)" }}
                >
                  {/* Avatar initials */}
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: "#0E7C86" }}
                  >
                    {session.user?.name?.[0]?.toUpperCase() ?? "U"}
                  </span>
                  <span className="hidden md:inline max-w-[120px] truncate">
                    {session.user?.name ?? session.user?.email}
                  </span>
                  {role === "admin" && pendingCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] text-[9px] font-black text-[#0D1B2A]"
                      style={{ boxShadow: "1px 1px 0 #0D1B2A" }}
                    >
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                </button>

                {/* Dropdown menu */}
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div
                      className="absolute right-0 top-12 z-50 w-52 border-2 py-1 shadow-lg"
                      style={{ background: "var(--bg-surface)", borderColor: "var(--border-medium)" }}
                    >
                      {/* Role badge */}
                      <div className="border-b px-4 py-2" style={{ borderColor: "var(--border-default)" }}>
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                          {role}
                        </p>
                        <p className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                          {session.user?.email}
                        </p>
                      </div>

                      {/* Operator dashboard */}
                      {(role === "operator" || role === "admin") && (
                        <Link
                          href="/operator"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm hover:opacity-80"
                          style={{ color: "var(--text-primary)" }}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Operator Dashboard
                        </Link>
                      )}

                      {/* Admin panel */}
                      {role === "admin" && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm hover:opacity-80"
                          style={{ color: "var(--text-primary)" }}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Admin Panel
                        </Link>
                      )}

                      {/* Sign out */}
                      <button
                        onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                        className="flex w-full items-center gap-2 border-t px-4 py-2 text-sm hover:opacity-80"
                        style={{ borderColor: "var(--border-default)", color: "var(--status-stopped-text)" }}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="flex h-10 items-center gap-2 rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-4 text-sm font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-amber-400"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 md:px-8 md:pt-12">
        <div className="mb-8 md:mb-10">
          <h1
            className="text-4xl font-extrabold uppercase sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--text-primary)" }}
          >
            {title}
          </h1>
        </div>
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t-4 border-[#F4A522] bg-[#0D1B2A] px-2 text-white md:hidden">
        <Link
          href="/search"
          className={`flex min-w-[70px] flex-col items-center gap-1 rounded-md px-2 py-1 text-xs ${
            pathname.startsWith("/search") ? "bg-[#F4A522] text-[#0D1B2A]" : "text-white"
          }`}
        >
          <Bus className="h-4 w-4" />
          <span>{tr("routeSearch")}</span>
        </Link>

        {session ? (
          <>
            {(role === "operator" || role === "admin") && (
              <Link
                href="/operator"
                className={`flex min-w-[70px] flex-col items-center gap-1 rounded-md px-2 py-1 text-xs ${
                  pathname.startsWith("/operator") ? "bg-[#F4A522] text-[#0D1B2A]" : "text-white"
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            )}
            {role === "admin" && (
              <Link
                href="/admin"
                className={`relative flex min-w-[70px] flex-col items-center gap-1 rounded-md px-2 py-1 text-xs ${
                  pathname.startsWith("/admin") ? "bg-[#F4A522] text-[#0D1B2A]" : "text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Admin</span>
                {pendingCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-1 text-[9px] font-black text-[#0D1B2A]"
                    style={{ boxShadow: "1px 1px 0 #0D1B2A" }}
                  >
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex min-w-[70px] flex-col items-center gap-1 rounded-md px-2 py-1 text-xs text-white"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <Link
            href="/auth"
            className={`flex min-w-[70px] flex-col items-center gap-1 rounded-md px-2 py-1 text-xs ${
              pathname === "/auth" ? "bg-[#F4A522] text-[#0D1B2A]" : "text-white"
            }`}
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In</span>
          </Link>
        )}
      </nav>

      {/* ── Desktop floating nav ── */}
      <div className="fixed bottom-5 right-4 hidden gap-2 md:flex">
        <Link
          href="/search"
          className="rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-amber-400"
        >
          {tr("routeSearch")}
        </Link>
        {!session && (
          <Link
            href="/auth"
            className="rounded-none border-2 border-[#0D1B2A] bg-[#0D1B2A] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-800"
          >
            Login
          </Link>
        )}
      </div>
    </div>
  );
}