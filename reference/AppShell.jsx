import { Link, useLocation } from "react-router-dom";
import { Bus, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";

export const AppShell = ({ title, subtitle, children }) => {
  const { pathname } = useLocation();
  const { language, setLanguage, tr } = useLanguage();

  const navItems = [
    { to: "/search", label: tr("routeSearch"), icon: Bus },
    { to: "/operator", label: tr("operator"), icon: UserCog },
    { to: "/admin", label: tr("admin"), icon: ShieldCheck },
  ];

  return (
    <div className="busconnect-page">
      <header
        data-testid="app-shell-header"
        className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div data-testid="brand-block" className="min-w-0">
            <Link
              to="/"
              data-testid="brand-home-link"
              className="font-['Barlow_Condensed'] text-3xl font-extrabold uppercase text-[#0D1B2A]"
            >
              {tr("brand")}
            </Link>
            <p data-testid="header-subtitle" className="text-xs text-slate-500 md:text-sm">
              {subtitle || tr("tagline")}
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger data-testid="language-switcher" className="h-10 w-[130px] border-2 border-slate-300 bg-white">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((item) => (
                  <SelectItem
                    key={item.code}
                    value={item.code}
                    data-testid={`language-option-${item.code}`}
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 md:px-8 md:pt-12">
        <div className="mb-8 md:mb-10">
          <h1 data-testid="page-title" className="text-4xl font-extrabold uppercase text-[#0D1B2A] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
        </div>
        {children}
      </main>

      <nav
        data-testid="mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t-4 border-[#F4A522] bg-[#0D1B2A] px-2 text-white md:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              data-testid={`mobile-nav-link-${item.to.replace("/", "")}`}
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

      <div className="fixed bottom-5 right-4 hidden gap-2 md:flex">
        {navItems.map((item) => (
          <Button
            asChild
            key={item.to}
            data-testid={`desktop-nav-btn-${item.to.replace("/", "")}`}
            className="rounded-none border-2 border-[#0D1B2A] bg-[#F4A522] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#0D1B2A] hover:bg-amber-400"
          >
            <Link to={item.to}>{item.label}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
};
