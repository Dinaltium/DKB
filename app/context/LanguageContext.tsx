"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  t,
  languages,
  type Language,
  type TranslationKeys,
} from "@/lib/i18n/index";

interface LangCtx {
  language: Language;
  setLanguage: (l: Language) => void;
  tr: (key: TranslationKeys) => string;
}

const LanguageContext = createContext<LangCtx>({
  language: "tcy",
  setLanguage: () => {},
  tr: (key) => key as string,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>("tcy");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("buslink-lang") as Language | null;
      if (saved && saved in languages) {
        setLang(saved as Language);
      }
    } catch {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("buslink-lang", language);
    } catch {}
  }, [language, mounted]);

  function setLanguage(lang: Language) {
    setLang(lang);
  }

  const tr = (key: TranslationKeys) => t(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
