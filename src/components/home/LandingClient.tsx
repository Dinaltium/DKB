"use client";

import type { PlatformStats } from "@/app/api/stats/route";
import { useLanguage } from "@/app/context/LanguageContext";
import { useLiveBus } from "@/app/context/LiveBusContext";
import HeroTicketPreview from "@/components/blocks/HeroTicketPreview";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
	AlertCircle,
	ArrowRight,
	Bus,
	IndianRupee,
	MapPin,
	Radio,
	Ticket,
	Users,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";

const FleetMap = dynamic(() => import("@/components/maps/FleetMap"), {
	ssr: false,
});

// ── Section heading with BoldKit amber marker bar ─────────────────────────────
function SectionHeading({
	title,
	subtitle,
}: {
	title: string;
	subtitle?: string;
}) {
	return (
		<div className="mb-6 flex items-start gap-3">
			<span
				className="theme-bg-amber mt-1 h-7 w-2 shrink-0 border-2 border-foreground"
				aria-hidden
			/>
			<div>
				<h2
					className="text-2xl font-black uppercase leading-none tracking-wide md:text-3xl"
					style={{
						fontFamily: "'Barlow Condensed', sans-serif",
						color: "var(--text-primary)",
					}}
				>
					{title}
				</h2>
				{subtitle && (
					<p
						className="mt-1.5 max-w-xl text-sm"
						style={{ color: "var(--text-secondary)" }}
					>
						{subtitle}
					</p>
				)}
			</div>
		</div>
	);
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
	return (
		<div
			className="theme-panel h-52 animate-pulse rounded-none border-2"
			style={{
				borderColor: "var(--border-default)",
			}}
		/>
	);
}

// ── Stat tile ─────────────────────────────────────────────────────────────────
interface StatTileProps {
	label: string;
	value: number | string;
	icon: React.ReactNode;
	loading?: boolean;
}

function StatTile({ label, value, icon, loading }: StatTileProps) {
	return (
		<div className="theme-panel brutal-transition brutal-hover flex items-center gap-4 rounded-none border-2 p-5 neo-shadow">
			<div
				className="theme-surface-alt theme-text-teal flex h-11 w-11 shrink-0 items-center justify-center rounded-none border-2"
				style={{
					borderColor: "var(--border-default)",
				}}
			>
				{icon}
			</div>
			<div>
				<p
					className="text-3xl font-extrabold leading-none"
					style={{
						fontFamily: "'Barlow Condensed', sans-serif",
						color: "var(--text-primary)",
					}}
				>
					{loading ? (
						<span
							className="inline-block h-7 w-12 animate-pulse rounded-none"
							style={{ background: "var(--bg-surface-3)" }}
						/>
					) : (
						value
					)}
				</p>
				<p
					className="mt-0.5 text-xs font-semibold uppercase tracking-widest"
					style={{ color: "var(--text-muted)" }}
				>
					{label}
				</p>
			</div>
		</div>
	);
}

// ── Main landing (logged-out home) ────────────────────────────────────────────
export function LandingClient() {
	const { tr } = useLanguage();
	const { getPosition, buses } = useLiveBus();

	const [stats, setStats] = useState<PlatformStats | null>(null);
	const [statsLoading, setStatsLoading] = useState(true);

	useEffect(() => {
		fetch("/api/stats")
			.then((r) => r.json())
			.then((data: PlatformStats) => setStats(data))
			.catch(() => setStats(null))
			.finally(() => setStatsLoading(false));
	}, []);

	return (
		<AppShell title={tr("tagline")} subtitle={tr("corridorSubtitle")}>
			{/* ── Hero ── */}
			<section className="theme-panel relative grid gap-6 overflow-hidden rounded-none border-2 p-5 neo-shadow md:grid-cols-2 md:gap-10 md:p-8">
				{/* Corner accent block — pure BoldKit decoration */}
				<span
					className="theme-bg-amber pointer-events-none absolute -right-10 -top-10 h-28 w-28 rotate-12 border-2 border-foreground opacity-20"
					aria-hidden
				/>

				<div className="relative flex flex-col justify-center gap-5">
					{/* Kicker + live status */}
					<div className="flex flex-wrap items-center gap-2">
						<span className="theme-pill-accent inline-flex items-center rounded-none border-2 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em]">
							{tr("heroMvpLabel")}
						</span>
						{buses.length > 0 && (
							<span className="theme-bg-navy inline-flex items-center gap-1.5 rounded-none border-2 border-foreground px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-white">
								<span className="theme-text-amber flex items-center">
									<Radio className="h-3 w-3 animate-pulse" />
								</span>
								{buses.length} {tr("liveNow")}
							</span>
						)}
					</div>

					<p
						className="text-sm leading-relaxed md:text-base"
						style={{ color: "var(--text-secondary)" }}
					>
						{tr("heroDesc")}
					</p>

					{/* Full-width CTAs on mobile, inline on tablet+ */}
					<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
						<Link
							href="/search"
							className="theme-btn-primary brutal-transition brutal-hover inline-flex h-12 items-center justify-center gap-2 rounded-none border-2 px-5 text-sm font-bold uppercase tracking-wide neo-shadow hover:opacity-80"
						>
							{tr("searchRoute")}
							<ArrowRight className="h-4 w-4" />
						</Link>
						{buses.length > 0 && (
							<Link
								href={`/bus/${buses[0].id}`}
								className="theme-btn-secondary brutal-transition brutal-hover inline-flex h-12 items-center justify-center rounded-none border-2 px-5 text-sm font-bold uppercase tracking-wide neo-shadow hover:opacity-80"
							>
								{tr("scanQr")}
							</Link>
						)}
					</div>

					{/* Trust chips — feature highlights */}
					<div className="flex flex-wrap gap-2 pt-1">
						{[
							{
								icon: <IndianRupee className="h-3.5 w-3.5" />,
								label: "UPI Ready",
							},
							{ icon: <Radio className="h-3.5 w-3.5" />, label: "Live GPS" },
							{
								icon: <Ticket className="h-3.5 w-3.5" />,
								label: "Digital Tickets",
							},
						].map((chip) => (
							<span
								key={chip.label}
								className="theme-surface-alt inline-flex items-center gap-1.5 rounded-none border-2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
								style={{
									borderColor: "var(--border-default)",
									color: "var(--text-secondary)",
								}}
							>
								<span className="theme-text-teal">{chip.icon}</span>
								{chip.label}
							</span>
						))}
					</div>
				</div>

				{/* Hero interactive ticket preview — hidden on mobile to keep the
				    above-the-fold tight; CTAs reach the viewport without scroll. */}
				<div className="relative hidden items-center justify-center md:flex">
					<HeroTicketPreview />
				</div>
			</section>

			{/* ── Platform stats (from DB) ── */}
			<section className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
				<StatTile
					label="Active Buses"
					value={stats?.totalBuses ?? 0}
					icon={<Bus className="h-5 w-5" />}
					loading={statsLoading}
				/>
				<StatTile
					label="Stops"
					value={stats?.totalStops ?? 0}
					icon={<MapPin className="h-5 w-5" />}
					loading={statsLoading}
				/>
				<StatTile
					label="Operators"
					value={stats?.approvedOperators ?? 0}
					icon={<Users className="h-5 w-5" />}
					loading={statsLoading}
				/>
				<StatTile
					label="Open Complaints"
					value={stats?.pendingComplaints ?? 0}
					icon={<AlertCircle className="h-5 w-5" />}
					loading={statsLoading}
				/>
			</section>

			{/* ── Commuter Problems vs BusLink Solutions ── */}
			<section className="mt-12">
				<SectionHeading
					title="Reimagining Corridor Transit"
					subtitle="How BusLink fixes the daily friction for commuters on the Mangalore ↔ Udupi route."
				/>

				<div className="grid gap-6 md:grid-cols-3">
					{[
						{
							n: "01",
							title: "Fair Fares",
							icon: <IndianRupee className="h-5 w-5" />,
							iconCls:
								"bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
							problem: tr("stat1"),
							solution: tr("feat1"),
						},
						{
							n: "02",
							title: "Live Routes",
							icon: <MapPin className="h-5 w-5" />,
							iconCls:
								"bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
							problem: tr("stat2"),
							solution: tr("feat2"),
						},
						{
							n: "03",
							title: "Tracked Complaints",
							icon: <Users className="h-5 w-5" />,
							iconCls:
								"bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
							problem: tr("stat3"),
							solution: tr("feat3"),
						},
					].map((card) => (
						<div
							key={card.n}
							className="theme-panel brutal-transition brutal-hover flex flex-col justify-between rounded-none border-2 p-6 neo-shadow"
							style={{ borderColor: "var(--border-default)" }}
						>
							<div>
								<div className="flex items-center justify-between">
									<div
										className={`inline-flex h-9 w-9 items-center justify-center border-2 border-foreground ${card.iconCls}`}
									>
										{card.icon}
									</div>
									<span
										className="text-3xl font-black leading-none opacity-15"
										style={{
											fontFamily: "'Barlow Condensed', sans-serif",
											color: "var(--text-primary)",
										}}
									>
										{card.n}
									</span>
								</div>
								<h3
									className="mt-4 text-lg font-black uppercase tracking-wide"
									style={{
										fontFamily: "'Barlow Condensed', sans-serif",
										color: "var(--text-primary)",
									}}
								>
									{card.title}
								</h3>
								<p className="mt-1 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
									The Problem
								</p>
								<p
									className="mt-2 text-xs leading-relaxed"
									style={{ color: "var(--text-secondary)" }}
								>
									{card.problem}
								</p>
							</div>
							<div className="mt-6 border-t-2 border-dashed border-foreground/15 pt-4">
								<span className="theme-text-teal mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
									<ArrowRight className="h-3 w-3" />
									BusLink Solution
								</span>
								<p
									className="text-sm font-extrabold"
									style={{ color: "var(--text-primary)" }}
								>
									{card.solution}
								</p>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* ── Fleet Map ── */}
			<section className="mt-12">
				<SectionHeading
					title="All Bus Locations"
					subtitle="Every tracked bus on the corridor, live on the map."
				/>
				<FleetMap />
			</section>

			{/* ── Live Bus Cards ── */}
			<section className="mt-10">
				<SectionHeading title={tr("liveNow")} />

				{/* Loading skeleton */}
				{buses.length === 0 && statsLoading && (
					<div className="grid gap-4 md:grid-cols-3">
						<SkeletonCard />
						<SkeletonCard />
						<SkeletonCard />
					</div>
				)}

				{/* Empty state — data loaded but no buses in DB */}
				{buses.length === 0 && !statsLoading && (
					<EmptyState
						title="No buses running"
						description="No buses have been added to the platform yet."
						action={
							<Link
								href="/auth"
								className="theme-btn-primary brutal-transition brutal-hover inline-flex h-10 items-center rounded-none border-2 px-5 text-xs font-bold uppercase tracking-wide neo-shadow hover:opacity-80"
							>
								Operator Login
							</Link>
						}
					/>
				)}

				{/* Bus cards */}
				{buses.length > 0 && (
					<div className="grid gap-4 md:grid-cols-3">
						{buses.map((bus) => {
							const pos = getPosition(bus.id);
							return (
								<Link key={bus.id} href={`/bus/${bus.id}`} className="block">
									<article
										className="theme-panel brutal-transition brutal-hover h-full rounded-none border-2 p-5 neo-shadow hover:opacity-100"
										style={{
											borderColor: "var(--border-default)",
										}}
									>
										{/* Bus number + status */}
										<div className="flex items-start justify-between gap-2">
											<span
												className="theme-pill-accent rounded-none border-2 px-2 py-0.5 text-sm font-black uppercase tracking-wide"
												style={{
													fontFamily: "'Barlow Condensed', sans-serif",
													background: "var(--color-navy)",
												}}
											>
												{bus.number}
											</span>
											<StatusBadge
												status={
													bus.status as "Running" | "Not Running" | "Delayed"
												}
											/>
										</div>

										{/* Route */}
										<p
											className="mt-2 text-sm font-semibold"
											style={{ color: "var(--text-primary)" }}
										>
											{bus.origin}{" "}
											<span className="theme-text-teal">&#8594;</span>{" "}
											{bus.destination}
										</p>

										{/* Live position */}
										{pos ? (
											<>
												<div
													className="theme-surface-alt mt-3 rounded-none border-2 px-3 py-2"
													style={{
														borderColor: "var(--border-default)",
													}}
												>
													<p className="theme-text-teal text-[10px] font-bold uppercase tracking-widest">
														Now between
													</p>
													<p
														className="mt-0.5 text-xs font-medium"
														style={{ color: "var(--text-primary)" }}
													>
														{pos.fromStop}{" "}
														<span className="theme-text-teal">&#8594;</span>{" "}
														{pos.toStop}
													</p>
												</div>
												<div className="mt-3">
													<div
														className="relative h-2 w-full rounded-none border-2 border-foreground"
														style={{ background: "var(--bg-surface-3)" }}
													>
														<div
															className="theme-bg-teal brutal-transition h-full rounded-none"
															style={{
																width: `${Math.round(pos.progressPct)}%`,
															}}
														/>
														{/* Animated bus emoji sitting directly on the progress bar track */}
														<div
															className="absolute -top-1.5 h-4 w-4 text-xs transition-all duration-300"
															style={{
																left: `calc(${Math.round(pos.progressPct)}% - 8px)`,
															}}
														>
															🚌
														</div>
													</div>
													<div
														className="mt-1.5 flex justify-between text-[10px]"
														style={{ color: "var(--text-muted)" }}
													>
														<span>{bus.origin}</span>
														<span className="theme-text-teal font-extrabold">
															{Math.round(pos.progressPct)}%
														</span>
														<span>{bus.destination}</span>
													</div>
												</div>
											</>
										) : (
											<p
												className="mt-3 text-xs"
												style={{ color: "var(--text-muted)" }}
											>
												Locating bus...
											</p>
										)}

										<p
											className="mt-4 text-xs font-bold uppercase tracking-widest"
											style={{ color: "var(--text-primary)" }}
										>
											{tr("track")} &#8594;
										</p>
									</article>
								</Link>
							);
						})}
					</div>
				)}
			</section>
		</AppShell>
	);
}
