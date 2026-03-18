"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/app/context/AuthProvider";
import { ThemeProvider } from "@/app/context/ThemeContext";
import { LanguageProvider } from "@/app/context/LanguageContext";
import { LiveBusProvider } from "@/app/context/LiveBusContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <LiveBusProvider>
            {children}
            <Toaster richColors position="top-center" />
          </LiveBusProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}