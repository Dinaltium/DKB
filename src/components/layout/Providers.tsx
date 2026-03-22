"use client";

import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/app/context/AuthProvider";
import { ThemeProvider } from "@/app/context/ThemeContext";
import { LanguageProvider } from "@/app/context/LanguageContext";
import { LiveBusProvider } from "@/app/context/LiveBusContext";
import { PageProgress } from "@/components/layout/PageProgress";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <LiveBusProvider>
            <Suspense fallback={null}>
              <PageProgress />
            </Suspense>
            {children}
            <Toaster richColors position="top-center" />
          </LiveBusProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}