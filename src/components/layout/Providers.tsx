"use client";

import { Suspense } from "react";
import { AuthProvider } from "@/app/context/AuthProvider";
import { LanguageProvider } from "@/app/context/LanguageContext";
import { LiveBusProvider } from "@/app/context/LiveBusContext";
import { ThemeProvider } from "@/app/context/ThemeContext";
import { PageProgress } from "@/components/layout/PageProgress";
import { Toaster } from "@/components/ui/sonner";

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
