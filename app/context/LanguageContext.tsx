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

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>("tcy");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("buslink-lang") as Language | null;
      if (saved) setLang(saved);
    } catch {}
  }, []);

  function setLanguage(lang: Language) {
    setLang(lang);
    try {
      localStorage.setItem("buslink-lang", lang);
    } catch {}
  }

  const tr = (key: keyof typeof TEXTS.en) => t(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
