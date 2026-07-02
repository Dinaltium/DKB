"use client";

import { hideSplash, isNative, setupStatusBar } from "@/lib/native";
import { useEffect } from "react";

/**
 * Runs once on first hydration. On the web it's a no-op; inside the
 * Capacitor shell it styles the status bar to match BoldKit and hides
 * the splash screen as soon as the React tree has mounted (so the user
 * doesn't see a blank white WebView frame between the splash and the
 * first paint).
 */
export function NativeInit() {
	useEffect(() => {
		if (!isNative()) return;
		setupStatusBar();
		// Give React a tick to paint the first frame, then drop the splash.
		const t = window.setTimeout(() => {
			hideSplash();
		}, 80);
		return () => window.clearTimeout(t);
	}, []);
	return null;
}
