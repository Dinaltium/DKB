"use client";

import { Toaster } from "sonner";
import { LanguageProvider } from "@/app/context/LanguageContext";
import { LiveBusProvider } from "@/app/context/LiveBusContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <LiveBusProvider>
        {children}
        <Toaster richColors position="top-center" />
      </LiveBusProvider>
    </LanguageProvider>
  );
}
