"use client";

import { useTheme as useAppTheme } from "@/app/context/ThemeContext";

/** Maps app ThemeContext to the shape BoldKit Sonner expects. */
export function useTheme() {
	const { theme } = useAppTheme();
	return { resolvedTheme: theme };
}
