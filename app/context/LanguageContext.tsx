"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { t, TEXTS } from "@/lib/i18n";
import type { Language } from "@/lib/types";

interface LangCtx {
  language: Language;
  setLanguage: (l: Language) => void;
  tr: (key: keyof typeof TEXTS.en) => string;
}

const LanguageContext = createContext<LangCtx>({
  language: "tcy",
  setLanguage: () => {},
  tr: (key) => key as string,
});

/** Read the persisted language from localStorage (client-only). */
function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "tcy"; // SSR — return default
  try {
    const saved = localStorage.getItem("buslink-lang") as Language | null;
    if (saved) return saved;
  } catch {}
  return "tcy";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer runs once on mount (client-side only after hydration).
  // On the server it returns the default "tcy" to avoid hydration mismatches.
  const [language, setLang] = useState<Language>(getInitialLanguage);

  // Keep localStorage in sync whenever the language changes.
  useEffect(() => {
    try {
      localStorage.setItem("buslink-lang", language);
    } catch {}
  }, [language]);

  function setLanguage(lang: Language) {
    setLang(lang);
  }

  const tr = (key: keyof typeof TEXTS.en) => t(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
