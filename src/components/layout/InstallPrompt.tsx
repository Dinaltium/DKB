"use client";

import { isNative } from "@/lib/native";
import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

// Type for the beforeinstallprompt event (not in standard lib.dom yet).
interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "buslink:install-dismissed-at";
const SUPPRESS_DAYS = 14;

export function InstallPrompt() {
	const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
		null,
	);
	const [visible, setVisible] = useState(false);
	const [installed, setInstalled] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;

		// Don't offer "Install" when we're already running inside the native
		// Android shell — the user obviously already installed it.
		if (isNative()) {
			setInstalled(true);
			return;
		}

		// Already installed as a PWA → don't show.
		const standalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			// iOS Safari
			(window.navigator as { standalone?: boolean }).standalone === true;
		if (standalone) {
			setInstalled(true);
			return;
		}

		// Recently dismissed?
		try {
			const ts = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
			if (ts && Date.now() - ts < SUPPRESS_DAYS * 24 * 60 * 60 * 1000) {
				return;
			}
		} catch {
			/* localStorage unavailable */
		}

		const onPrompt = (e: Event) => {
			e.preventDefault();
			setDeferred(e as BeforeInstallPromptEvent);
			setVisible(true);
		};

		const onInstalled = () => {
			setInstalled(true);
			setVisible(false);
			setDeferred(null);
		};

		window.addEventListener("beforeinstallprompt", onPrompt);
		window.addEventListener("appinstalled", onInstalled);
		return () => {
			window.removeEventListener("beforeinstallprompt", onPrompt);
			window.removeEventListener("appinstalled", onInstalled);
		};
	}, []);

	if (installed || !visible || !deferred) return null;

	const install = async () => {
		try {
			await deferred.prompt();
			const { outcome } = await deferred.userChoice;
			if (outcome === "dismissed") rememberDismissal();
		} finally {
			setVisible(false);
			setDeferred(null);
		}
	};

	const dismiss = () => {
		rememberDismissal();
		setVisible(false);
	};

	return (
		<section
			aria-label="Install BusLink"
			className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-md items-center gap-3 rounded-none border-2 p-3 neo-shadow md:bottom-6 md:left-auto md:right-6 md:mx-0"
			style={{
				background: "var(--bg-surface)",
				borderColor: "var(--border-default)",
				color: "var(--text-primary)",
				paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
			}}
		>
			<div
				className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none border-2"
				style={{
					borderColor: "var(--border-default)",
					background: "var(--cta-bg)",
				}}
			>
				<Download className="h-5 w-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-bold uppercase tracking-wide">
					Install BusLink
				</p>
				<p
					className="truncate text-xs"
					style={{ color: "var(--text-muted)" }}
				>
					Faster trips, works offline.
				</p>
			</div>
			<button
				type="button"
				onClick={install}
				className="theme-btn-primary brutal-transition brutal-hover h-10 rounded-none border-2 px-3 text-xs font-bold uppercase tracking-wide neo-shadow"
			>
				Install
			</button>
			<button
				type="button"
				onClick={dismiss}
				aria-label="Dismiss"
				className="h-10 w-10 rounded-none border-2 brutal-transition brutal-hover"
				style={{
					borderColor: "var(--border-default)",
					background: "var(--bg-surface-2)",
				}}
			>
				<X className="mx-auto h-4 w-4" />
			</button>
		</section>
	);
}

function rememberDismissal() {
	try {
		window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
	} catch {
		/* localStorage unavailable */
	}
}
