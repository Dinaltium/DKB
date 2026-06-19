"use client";

import { AuthProvider } from "@/app/context/AuthProvider";
import { LanguageProvider } from "@/app/context/LanguageContext";
import { LiveBusProvider } from "@/app/context/LiveBusContext";
import { ThemeProvider } from "@/app/context/ThemeContext";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { PageProgress } from "@/components/layout/PageProgress";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";

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
						<InstallPrompt />
						<Toaster richColors position="top-center" />
					</LiveBusProvider>
				</LanguageProvider>
			</ThemeProvider>
		</AuthProvider>
	);
}
