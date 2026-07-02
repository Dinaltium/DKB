"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { useTheme } from "@/app/context/ThemeContext";
import { BottomNav } from "@/components/layout/BottomNav";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";
import {
	LayoutDashboard,
	LogIn,
	LogOut,
	Moon,
	Settings as SettingsIcon,
	ShieldCheck,
	Sun,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AppShellProps {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
	const router = useRouter();
	const { language, setLanguage, tr } = useLanguage();
	const { isDark, toggleTheme } = useTheme();
	const { data: session, status } = useSession();
	const role = session?.user?.role;

	// menuOpen removed — DropdownMenu manages its own open state
	const [pendingCount, setPendingCount] = useState(0);

	useEffect(() => {
		if (role !== "admin") return;
		const fetchCount = async () => {
			try {
				const res = await fetch("/api/pending-count");
				if (res.status === 401) {
					signOut({ callbackUrl: "/auth" });
					return;
				}
				const { count } = await res.json();
				setPendingCount(typeof count === "number" ? count : 0);
			} catch {
				setPendingCount(0);
			}
		};
		fetchCount();
		const interval = setInterval(fetchCount, 30000);
		return () => clearInterval(interval);
	}, [role]);

	// Session validity checking: Poll session state to log out immediately if session is revoked
	useEffect(() => {
		if (!session) return;
		const checkSession = async () => {
			try {
				const res = await fetch("/api/auth/session");
				if (res.status === 401) {
					signOut({ callbackUrl: "/auth" });
				}
			} catch (err) {
				console.error("Session check failed:", err);
			}
		};
		const interval = setInterval(checkSession, 10000);
		return () => clearInterval(interval);
	}, [session]);

	useEffect(() => {
		const user = session?.user as { mustChangePassword?: boolean } | undefined;
		if (
			user?.mustChangePassword &&
			!sessionStorage.getItem("buslink-pwd-toast-shown")
		) {
			toast.warning("⚠ Temporary password — please update it soon.", {
				duration: Number.POSITIVE_INFINITY,
				action: {
					label: "Change Now →",
					onClick: () => router.push("/change-password"),
				},
				onDismiss: () => {
					sessionStorage.setItem("buslink-pwd-toast-shown", "true");
				},
			});
		}
	}, [session, router]);

	// Register active session in the database on load for all pages using AppShell
	useEffect(() => {
		if (!session?.user?.id) return;

		let sessionId = window.localStorage.getItem("buslink_session_id");
		if (!sessionId) {
			sessionId =
				typeof window.crypto?.randomUUID === "function"
					? window.crypto.randomUUID()
					: Math.random().toString(36).substring(2) + Date.now().toString(36);
			window.localStorage.setItem("buslink_session_id", sessionId);
		}

		// Ensure cookie is set so the server receives it on every page load/API query
		document.cookie = `buslink_session_id=${sessionId}; path=/; max-age=31536000; SameSite=Lax`;

		const parseUserAgent = async () => {
			const ua = window.navigator.userAgent;
			let browser = "Unknown Browser";
			let os = "Unknown OS";

			if (/Windows/i.test(ua)) os = "Windows";
			else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
			else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
			else if (/Android/i.test(ua)) os = "Android";
			else if (/Linux/i.test(ua)) os = "Linux";

			const isBrave =
				typeof (window.navigator as any).brave?.isBrave === "function"
					? await (window.navigator as any).brave.isBrave()
					: false;

			if (isBrave) {
				browser = "Brave";
			} else if (/Chrome/i.test(ua) && !/Chromium|Edge|OPR/i.test(ua)) {
				browser = "Chrome";
			} else if (/Safari/i.test(ua) && !/Chrome|Chromium/i.test(ua)) {
				browser = "Safari";
			} else if (/Firefox/i.test(ua)) {
				browser = "Firefox";
			} else if (/Edg/i.test(ua)) {
				browser = "Edge";
			} else if (/OPR|Opera/i.test(ua)) {
				browser = "Opera";
			}

			return `${browser} on ${os}`;
		};

		parseUserAgent().then((device) => {
			const register = (loc: string) => {
				fetch("/api/user-active-sessions", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ sessionId, device, location: loc }),
				}).catch(console.error);
			};

			fetch("https://ipapi.co/json/")
				.then((res) => (res.ok ? res.json() : {}))
				.then((data: any) => {
					const loc =
						data.city && data.region_code
							? `${data.city}, ${data.region_code}`
							: "Unknown Location";
					register(loc);
				})
				.catch(() => {
					register("Localhost / Unknown Location");
				});
		});
	}, [session]);

	return (
		// Native page scroll — letting the browser drive overflow restores
		// touch scrolling on mobile (Radix ScrollArea's custom viewport was
		// swallowing pointer events on touch devices) and brings back
		// momentum scrolling on iOS.
		<div className="buslink-page min-h-screen">
			{/* ── Header ── */}
			<header
				className="sticky top-0 z-30"
				style={{
					background: "var(--header-bg)",
					backdropFilter: "blur(12px)",
					borderBottom: "1px solid var(--header-border)",
				}}
			>
				<div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-8">
					{/* Brand */}
					<div className="min-w-0">
						<Link
							href="/"
							className="text-3xl uppercase tracking-wide"
							style={{
								fontFamily: "'Barlow Condensed', sans-serif",
								fontWeight: 800,
								color: "var(--text-primary)",
							}}
						>
							{tr("brand")}
						</Link>
						<p
							className="text-xs md:text-sm"
							style={{ color: "var(--text-muted)" }}
						>
							{subtitle ?? tr("tagline")}
						</p>
					</div>

					{/* Controls */}
					<div className="flex items-center gap-2">
						{/* Language switcher */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									className="theme-btn-secondary brutal-transition brutal-hover flex h-10 items-center justify-between gap-2 rounded-none border-2 px-3 text-sm font-bold uppercase tracking-wide neo-shadow hover:opacity-100"
									style={{
										color: "var(--text-primary)",
									}}
								>
									{LANGUAGE_OPTIONS.find((opt) => opt.code === language)
										?.label ?? "EN"}
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								{LANGUAGE_OPTIONS.map((opt) => (
									<DropdownMenuItem
										key={opt.code}
										onClick={() => setLanguage(opt.code as typeof language)}
										className="cursor-pointer font-bold uppercase tracking-wide"
									>
										{opt.label}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Theme toggle */}
						<button
							onClick={toggleTheme}
							aria-label={
								isDark ? "Switch to light mode" : "Switch to dark mode"
							}
							className="brutal-transition brutal-hover h-10 rounded-none border-2 px-2 text-sm neo-shadow focus:outline-none hover:opacity-100"
							style={{
								background: isDark
									? "var(--bg-surface-2)"
									: "var(--bg-surface)",
								color: "var(--text-primary)",
							}}
						>
							{isDark ? (
								<Sun className="theme-text-amber h-4 w-4" />
							) : (
								<Moon
									className="h-4 w-4"
									style={{ color: "var(--text-secondary)" }}
								/>
							)}
						</button>

						{/* Auth button / user menu */}
						{status === "loading" ? (
							// Hide loading skeleton on mobile — BottomNav covers the
							// auth entry point there, and a hung skeleton was rendering
							// as a permanent empty box for users with slow session fetch.
							<div
								className="hidden h-10 w-24 animate-pulse rounded-none border-2 neo-shadow md:block"
								style={{
									background: "var(--bg-surface-2)",
								}}
							/>
						) : session ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									{/* Same trigger button as before — visually identical */}
									<button
										className="theme-btn-secondary brutal-transition brutal-hover relative flex h-10 items-center gap-2 rounded-none border-2 px-3 text-sm font-bold uppercase tracking-wide neo-shadow hover:opacity-100"
										style={{
											color: "var(--text-primary)",
										}}
									>
										{/* Avatar initials */}
										<span className="theme-avatar flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
											{session.user?.name?.[0]?.toUpperCase() ?? "U"}
										</span>
										<span className="hidden md:inline max-w-[120px] truncate">
											{session.user?.name ?? session.user?.email}
										</span>
										{role === "admin" && pendingCount > 0 && (
											<span className="theme-counter absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-none border-2 text-[9px] font-black">
												{pendingCount > 99 ? "99+" : pendingCount}
											</span>
										)}
									</button>
								</DropdownMenuTrigger>

								<DropdownMenuContent align="end" className="w-52">
									{/* Role + email */}
									<DropdownMenuLabel className="flex flex-col gap-0.5">
										<span className="text-xs font-black uppercase tracking-widest">
											{role}
										</span>
										<span className="truncate text-xs font-normal normal-case tracking-normal text-muted-foreground">
											{session.user?.email}
										</span>
									</DropdownMenuLabel>

									<DropdownMenuSeparator />

									{/* Operator Dashboard (only for operator role) */}
									{role === "operator" && (
										<DropdownMenuItem asChild>
											<Link
												href="/operator"
												className="flex cursor-pointer items-center gap-2"
											>
												<LayoutDashboard className="h-4 w-4" />
												Operator Dashboard
											</Link>
										</DropdownMenuItem>
									)}

									{/* Admin panel */}
									{role === "admin" && (
										<DropdownMenuItem asChild>
											<Link
												href="/admin"
												className="flex cursor-pointer items-center gap-2"
											>
												<ShieldCheck className="h-4 w-4" />
												Admin Panel
												{pendingCount > 0 && (
													<span className="theme-counter ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-none border px-1 text-[9px] font-black">
														{pendingCount}
													</span>
												)}
											</Link>
										</DropdownMenuItem>
									)}

									{/* Settings (visible to logged-in users, replaces Operator Dashboard for Admin) */}
									{role === "admin" && (
										<DropdownMenuItem asChild>
											<Link
												href="/settings"
												className="flex cursor-pointer items-center gap-2"
											>
												<SettingsIcon className="h-4 w-4" />
												Settings
											</Link>
										</DropdownMenuItem>
									)}

									<DropdownMenuSeparator />

									{/* Sign out */}
									<DropdownMenuItem
										onClick={() => signOut({ callbackUrl: "/" })}
										className="flex cursor-pointer items-center gap-2 focus:bg-destructive/10 focus:text-destructive"
										style={{ color: "var(--status-stopped-text)" }}
									>
										<LogOut className="h-4 w-4" />
										Sign Out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							// Hidden on mobile — BottomNav's "Sign in" tab covers it.
							// Visible from md upwards where there is no bottom nav.
							<Link
								href="/auth"
								className="theme-btn-primary brutal-transition brutal-hover hidden h-10 items-center gap-2 rounded-none border-2 px-4 text-sm font-bold uppercase tracking-wide neo-shadow hover:opacity-100 md:flex"
							>
								<LogIn className="h-4 w-4" />
								<span>Login</span>
							</Link>
						)}
					</div>
				</div>
			</header>

			{/* ── Main content ── */}
			<main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pt-12">
				<div className="mb-5 md:mb-10">
					<h1
						className="text-2xl font-extrabold uppercase leading-tight sm:text-4xl lg:text-6xl"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							color: "var(--text-primary)",
						}}
					>
						{title}
					</h1>
				</div>
				{children}
			</main>

			{/* ── Mobile bottom nav ── */}
			<BottomNav pendingCount={pendingCount} />

			<footer
				className="mt-8 border-t-2 px-4 py-6 md:px-8"
				style={{
					background: "var(--header-bg)",
					borderColor: "var(--header-border)",
				}}
			>
				<div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 text-xs sm:flex-row">
					<span style={{ color: "var(--text-muted)" }}>
						© {new Date().getFullYear()} BusLink — Mangaluru–Udupi corridor.
					</span>
					<nav className="flex gap-4 font-bold uppercase tracking-wide">
						<Link href="/privacy" style={{ color: "var(--text-secondary)" }}>
							Privacy
						</Link>
						<Link href="/terms" style={{ color: "var(--text-secondary)" }}>
							Terms
						</Link>
					</nav>
				</div>
			</footer>
		</div>
	);
}
