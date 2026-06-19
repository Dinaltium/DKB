"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { useTheme } from "@/app/context/ThemeContext";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";
import {
	Bus,
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
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AppShellProps {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
	const pathname = usePathname();
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
		<ScrollArea className="h-screen w-full">
			<div className="buslink-page">
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
								<div
									className="h-10 w-24 animate-pulse rounded-none border-2 neo-shadow"
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
								<Link
									href="/auth"
									className="theme-btn-primary brutal-transition brutal-hover flex h-10 items-center gap-2 rounded-none border-2 px-4 text-sm font-bold uppercase tracking-wide neo-shadow hover:opacity-100"
								>
									<LogIn className="h-4 w-4" />
									<span>Login</span>
								</Link>
							)}
						</div>
					</div>
				</header>

				{/* ── Main content ── */}
				<main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 md:px-8 md:pt-12">
					<div className="mb-8 md:mb-10">
						<h1
							className="text-4xl font-extrabold uppercase sm:text-5xl lg:text-6xl"
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
				<nav className="theme-nav-shell fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t-4 px-2 md:hidden">
					<Link
						href="/search"
						className={`flex min-w-[70px] flex-col items-center gap-1 rounded-none border-2 px-2 py-1 text-xs ${
							pathname.startsWith("/search")
								? "theme-nav-item-active"
								: "theme-nav-item-idle border-transparent"
						}`}
					>
						<Bus className="h-4 w-4" />
						<span>{tr("routeSearch")}</span>
					</Link>

					{session ? (
						<>
							{role === "operator" && (
								<Link
									href="/operator"
									className={`flex min-w-[70px] flex-col items-center gap-1 rounded-none border-2 px-2 py-1 text-xs ${
										pathname.startsWith("/operator")
											? "theme-nav-item-active"
											: "theme-nav-item-idle border-transparent"
									}`}
								>
									<LayoutDashboard className="h-4 w-4" />
									<span>Dashboard</span>
								</Link>
							)}
							{role === "admin" && (
								<>
									<Link
										href="/admin"
										className={`relative flex min-w-[70px] flex-col items-center gap-1 rounded-none border-2 px-2 py-1 text-xs ${
											pathname.startsWith("/admin")
												? "theme-nav-item-active"
												: "theme-nav-item-idle border-transparent"
										}`}
									>
										<ShieldCheck className="h-4 w-4" />
										<span>Admin</span>
										{pendingCount > 0 && (
											<span className="theme-counter absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-none border-2 px-1 text-[9px] font-black">
												{pendingCount > 99 ? "99+" : pendingCount}
											</span>
										)}
									</Link>
									<Link
										href="/settings"
										className={`flex min-w-[70px] flex-col items-center gap-1 rounded-none border-2 px-2 py-1 text-xs ${
											pathname.startsWith("/settings")
												? "theme-nav-item-active"
												: "theme-nav-item-idle border-transparent"
										}`}
									>
										<SettingsIcon className="h-4 w-4" />
										<span>Settings</span>
									</Link>
								</>
							)}
							<button
								onClick={() => signOut({ callbackUrl: "/" })}
								className="theme-nav-item-idle flex min-w-[70px] flex-col items-center gap-1 rounded-none border-2 border-transparent px-2 py-1 text-xs"
							>
								<LogOut className="h-4 w-4" />
								<span>Sign Out</span>
							</button>
						</>
					) : (
						<Link
							href="/auth"
							className={`flex min-w-[70px] flex-col items-center gap-1 rounded-none border-2 px-2 py-1 text-xs ${
								pathname === "/auth"
									? "theme-nav-item-active"
									: "theme-nav-item-idle border-transparent"
							}`}
						>
							<LogIn className="h-4 w-4" />
							<span>Sign In</span>
						</Link>
					)}
				</nav>

				{/* ── Desktop floating nav ── */}
				<div className="fixed bottom-5 right-4 hidden gap-2 md:flex">
					<Link
						href="/search"
						className="theme-btn-primary brutal-transition brutal-hover rounded-none border-2 px-4 py-2 text-xs font-bold uppercase tracking-wide neo-shadow hover:opacity-90"
					>
						{tr("routeSearch")}
					</Link>
					{!session && (
						<Link
							href="/auth"
							className="theme-btn-secondary brutal-transition brutal-hover rounded-none border-2 px-4 py-2 text-xs font-bold uppercase tracking-wide neo-shadow hover:opacity-90"
						>
							Login
						</Link>
					)}
				</div>
				<footer
					className="bottom-0"
					style={{
						background: "var(--header-bg)",
						borderBottom: "1px solid var(--header-border)",
					}}
				/>
			</div>
		</ScrollArea>
	);
}
