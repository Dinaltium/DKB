"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "light",
  toggleTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // On mount: read from localStorage or system preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("buslink-theme") as Theme | null;
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        return;
      }
    } catch {}
    // Fall back to system preference
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  // Apply theme to <html> element so Tailwind dark: variants + CSS vars both work
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
      root.classList.add("dark");
    } else {
      root.setAttribute("data-theme", "light");
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("buslink-theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);