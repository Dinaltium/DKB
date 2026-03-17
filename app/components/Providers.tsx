"use client";

import { Toaster } from "sonner";
import { LanguageProvider } from "@/app/context/LanguageContext";
import { LiveBusProvider } from "@/app/context/LiveBusContext";
import { ThemeProvider } from "@/app/context/ThemeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <LiveBusProvider>
          {children}
          <Toaster richColors position="top-center" />
        </LiveBusProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}