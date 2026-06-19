"use client";

import {
	getConductorTripsAction,
	getMyConductorAccessAction,
} from "@/lib/actions/conductor";
import {
	activateTripAction,
	advanceStopAction,
	endTripAction,
} from "@/lib/actions/trips";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BusAssignment {
	bus: {
		id: string;
		number: string;
		origin: string;
		destination: string;
		fullFare: number;
		totalSeats: number;
		occupiedSeats: number;
		status: string;
		driverName: string;
		conductorName: string;
		isLive: boolean;
	};
	conductorCode: string;
	grantedAt: Date;
}

interface TripWithBus {
	id: number;
	busId: string;
	routeId: number | null;
	conductorId: string | null;
	departureDate: string;
	departureTime24: string;
	status: string;
	currentStopIdx: number;
	isLive: boolean;
	bus: {
		id: string;
		number: string;
		origin: string;
		destination: string;
	};
}

interface TripReport {
	id: number;
	tripId: number | null;
	busId: string | null;
	totalPassengers: number;
	digitalTickets: number;
	cashTickets: number;
	totalRevenueInr: string;
	createdAt: Date;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ConductorPage() {
	const [data, setData] = useState<{
		assignments: BusAssignment[];
		recentReports: TripReport[];
		summary: {
			totalTrips: number;
			totalEarnings: string;
			totalPassengers: number;
		};
	} | null>(null);
	const [trips, setTrips] = useState<TripWithBus[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTripId, setActiveTripId] = useState<number | null>(null);
	const [isPending, startTransition] = useTransition();

	// Find currently active trip
	const activeTrip = trips.find((t) => t.status === "active");
	const scheduledTrips = trips.filter((t) => t.status === "scheduled");

	useEffect(() => {
		loadAll();
	}, []);

	const loadAll = async () => {
		setLoading(true);
		try {
			const [accessRes, tripsRes] = await Promise.all([
				getMyConductorAccessAction(),
				getConductorTripsAction(),
			]);
			if (accessRes.success && accessRes.data) {
				setData(accessRes.data);
			}
			if (tripsRes.success && tripsRes.data) {
				setTrips(tripsRes.data as TripWithBus[]);
				const active = tripsRes.data.find((t: any) => t.status === "active");
				if (active) setActiveTripId(active.id);
			}
		} catch (err: any) {
			toast.error("Failed to load conductor data");
		} finally {
			setLoading(false);
		}
	};

	const handleActivate = async (tripId: number) => {
		startTransition(async () => {
			const res = await activateTripAction(tripId);
			if (res.success) {
				toast.success("Trip activated! You are now live.");
				setActiveTripId(tripId);
				await loadAll();
			} else {
				toast.error(res.error || "Failed to activate trip");
			}
		});
	};

	const handleAdvanceStop = async () => {
		if (!activeTripId) return;
		startTransition(async () => {
			const res = await advanceStopAction(activeTripId);
			if (res.success && res.data) {
				toast.success(
					`Advanced → ${res.data.currentStop} (${res.data.remainingStops} stops left)`,
				);
			} else {
				toast.error(res.error || "Failed to advance stop");
			}
		});
	};

	const handleEndTrip = async () => {
		if (!activeTripId) return;
		if (!confirm("End this trip? A trip report will be generated.")) return;
		startTransition(async () => {
			const res = await endTripAction(activeTripId);
			if (res.success && res.data) {
				toast.success(
					`Trip complete! ₹${res.data.totalRevenueInr} collected from ${res.data.totalPassengers} passengers.`,
				);
				setActiveTripId(null);
				await loadAll();
			} else {
				toast.error(res.error || "Failed to end trip");
			}
		});
	};

	// ── Loading ────────────────────────────────────────────────────────────────

	if (loading) {
		return (
			<div
				className="min-h-screen flex items-center justify-center"
				style={{ background: "var(--bg-page)" }}
			>
				<div className="text-center space-y-2">
					<div
						className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto"
						style={{ borderColor: "var(--color-amber)", borderTopColor: "transparent" }}
					/>
					<p
						className="text-sm font-bold uppercase tracking-widest"
						style={{ color: "var(--text-muted)" }}
					>
						Loading your dashboard...
					</p>
				</div>
			</div>
		);
	}

	const assignment = data?.assignments?.[0] ?? null;
	const summary = data?.summary ?? { totalTrips: 0, totalEarnings: "0.00", totalPassengers: 0 };
	const reports = data?.recentReports ?? [];

	// ── No Assignment State ────────────────────────────────────────────────────

	if (!assignment) {
		return (
			<div
				className="min-h-screen flex flex-col items-center justify-center gap-6 p-6"
				style={{ background: "var(--bg-page)" }}
			>
				<div
					className="border-4 p-8 max-w-md w-full text-center neo-shadow space-y-4"
					style={{
						borderColor: "var(--text-primary)",
						background: "var(--bg-surface)",
					}}
				>
					<div
						className="text-5xl font-black"
						style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
					>
						🚌
					</div>
					<h1
						className="text-2xl font-black uppercase"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							color: "var(--text-primary)",
						}}
					>
						No Bus Assigned
					</h1>
					<p className="text-sm" style={{ color: "var(--text-secondary)" }}>
						You don't have a bus assigned yet. Contact your operator to get a
						bus assignment and conductor access code.
					</p>
					<Link
						href="/dashboard"
						className="inline-block border-2 px-4 py-2 text-xs font-bold uppercase neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none"
						style={{
							borderColor: "var(--text-primary)",
							color: "var(--text-primary)",
						}}
					>
						← Back to Dashboard
					</Link>
				</div>
			</div>
		);
	}

	const bus = assignment.bus;

	// ── Full Dashboard ─────────────────────────────────────────────────────────

	return (
		<div
			className="min-h-screen p-4 md:p-6 space-y-5"
			style={{ background: "var(--bg-page)" }}
		>
			{/* ── Header ─────────────────────────────────────────── */}
			<div
				className="border-2 p-4 neo-shadow"
				style={{
					borderColor: "var(--text-primary)",
					background: "var(--bg-surface)",
				}}
			>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<p
							className="text-xs font-bold uppercase tracking-widest"
							style={{ color: "var(--color-amber)" }}
						>
							Conductor Panel
						</p>
						<h1
							className="text-3xl font-black uppercase leading-none"
							style={{
								fontFamily: "'Barlow Condensed', sans-serif",
								color: "var(--text-primary)",
							}}
						>
							Bus {bus.number}
						</h1>
						<p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
							{bus.origin} → {bus.destination}
						</p>
					</div>

					{/* Live status pill */}
					<div className="flex items-center gap-3">
						{activeTrip ? (
							<div
								className="flex items-center gap-2 border-2 px-3 py-1"
								style={{
									borderColor: "hsl(var(--success))",
									background: "var(--status-running-bg)",
								}}
							>
								<span
									className="w-2 h-2 rounded-full live-ping"
									style={{ background: "hsl(var(--success))" }}
								/>
								<span
									className="text-xs font-bold uppercase"
									style={{ color: "hsl(var(--success))" }}
								>
									Live
								</span>
							</div>
						) : (
							<div
								className="border-2 px-3 py-1"
								style={{ borderColor: "var(--border-default)" }}
							>
								<span className="text-xs font-bold uppercase" style={{ color: "var(--text-muted)" }}>
									Offline
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ── Stats Row ──────────────────────────────────────── */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				{[
					{
						label: "Total Trips",
						value: summary.totalTrips,
						color: "var(--color-teal)",
					},
					{
						label: "Total Revenue",
						value: `₹${Number(summary.totalEarnings).toLocaleString("en-IN")}`,
						color: "var(--color-amber)",
					},
					{
						label: "Passengers",
						value: summary.totalPassengers,
						color: "hsl(var(--primary))",
					},
					{
						label: "Seats",
						value: `${bus.occupiedSeats}/${bus.totalSeats}`,
						color: "hsl(var(--info))",
					},
				].map((stat) => (
					<div
						key={stat.label}
						className="border-2 p-3 neo-shadow"
						style={{
							borderColor: "var(--text-primary)",
							background: "var(--bg-surface)",
						}}
					>
						<p className="text-xs font-bold uppercase" style={{ color: "var(--text-muted)" }}>
							{stat.label}
						</p>
						<p
							className="text-2xl font-black"
							style={{
								fontFamily: "'Barlow Condensed', sans-serif",
								color: stat.color,
							}}
						>
							{stat.value}
						</p>
					</div>
				))}
			</div>

			{/* ── Bus Card + Conductor Code ───────────────────────── */}
			<div className="grid gap-4 md:grid-cols-2">
				{/* Bus details */}
				<div
					className="border-2 p-4 space-y-3"
					style={{
						borderColor: "var(--text-primary)",
						background: "var(--bg-surface)",
					}}
				>
					<h2
						className="text-sm font-bold uppercase tracking-wide"
						style={{ color: "var(--text-muted)" }}
					>
						Your Assigned Bus
					</h2>
					<div className="space-y-2">
						{[
							["Bus Number", bus.number],
							["Route", `${bus.origin} → ${bus.destination}`],
							["Full Fare", `₹${bus.fullFare}`],
							["Total Seats", bus.totalSeats],
							["Registered Driver", bus.driverName],
							["Registered Conductor", bus.conductorName],
							[
								"Bus Status",
								<span
									key="status"
									className="font-bold"
									style={{
										color:
											bus.status === "Running"
												? "hsl(var(--success))"
												: bus.status === "Delayed"
													? "hsl(var(--warning))"
													: "hsl(var(--destructive))",
									}}
								>
									{bus.status}
								</span>,
							],
						].map(([label, val]) => (
							<div
								key={String(label)}
								className="flex items-center justify-between gap-2 text-sm"
							>
								<span style={{ color: "var(--text-muted)" }}>{label}</span>
								<span className="font-bold text-right" style={{ color: "var(--text-primary)" }}>
									{val}
								</span>
							</div>
						))}
					</div>
				</div>

				{/* Conductor code */}
				<div
					className="border-2 p-4 space-y-3"
					style={{
						borderColor: "var(--color-amber)",
						background: "var(--bg-surface)",
					}}
				>
					<h2
						className="text-sm font-bold uppercase tracking-wide"
						style={{ color: "var(--text-muted)" }}
					>
						Your Conductor Code
					</h2>
					<p
						className="text-4xl font-black tracking-widest"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							color: "var(--color-amber)",
						}}
					>
						{assignment.conductorCode}
					</p>
					<p className="text-xs" style={{ color: "var(--text-muted)" }}>
						This code identifies you as the conductor for Bus {bus.number}.
						You'll need this to activate trips on this bus.
					</p>
					<p className="text-xs" style={{ color: "var(--text-muted)" }}>
						Assigned:{" "}
						<span className="font-bold">
							{new Date(assignment.grantedAt).toLocaleDateString("en-IN", {
								day: "numeric",
								month: "short",
								year: "numeric",
							})}
						</span>
					</p>

					<Link
						href={`/bus/${bus.id}`}
						className="inline-flex items-center gap-1 border-2 px-3 py-2 text-xs font-bold uppercase neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none"
						style={{
							borderColor: "var(--text-primary)",
							color: "var(--text-primary)",
						}}
					>
						View Bus Page →
					</Link>
				</div>
			</div>

			{/* ── Active Trip Control ────────────────────────────── */}
			{activeTrip && (
				<div
					className="border-2 p-4 space-y-4"
					style={{
						borderColor: "hsl(var(--success))",
						background: "var(--status-running-bg)",
					}}
				>
					<div className="flex items-center justify-between">
						<div>
							<p
								className="text-xs font-bold uppercase"
								style={{ color: "hsl(var(--success))" }}
							>
								Active Trip In Progress
							</p>
							<p
								className="text-xl font-black"
								style={{
									fontFamily: "'Barlow Condensed', sans-serif",
									color: "var(--text-primary)",
								}}
							>
								Trip #{activeTrip.id} — {activeTrip.bus.number}
							</p>
							<p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
								{activeTrip.departureDate} at {activeTrip.departureTime24}
							</p>
						</div>
					</div>

					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={handleAdvanceStop}
							disabled={isPending}
							className="border-2 px-4 py-2 text-sm font-bold uppercase neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none disabled:opacity-50"
							style={{
								background: "var(--color-teal)",
								color: "#fff",
								borderColor: "var(--text-primary)",
							}}
						>
							{isPending ? "Processing..." : "→ Advance to Next Stop"}
						</button>
						<button
							type="button"
							onClick={handleEndTrip}
							disabled={isPending}
							className="border-2 px-4 py-2 text-sm font-bold uppercase neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none disabled:opacity-50"
							style={{
								background: "hsl(var(--destructive))",
								color: "#fff",
								borderColor: "var(--text-primary)",
							}}
						>
							End Trip & Generate Report
						</button>
					</div>
				</div>
			)}

			{/* ── Scheduled Trips ────────────────────────────────── */}
			{scheduledTrips.length > 0 && (
				<div
					className="border-2 p-4 space-y-3"
					style={{
						borderColor: "var(--text-primary)",
						background: "var(--bg-surface)",
					}}
				>
					<h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
						Upcoming Trips for Your Bus
					</h2>
					<div className="space-y-2">
						{scheduledTrips.map((t) => (
							<div
								key={t.id}
								className="border-2 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
								style={{
									borderColor: "var(--border-default)",
									background: "var(--bg-surface-2)",
								}}
							>
								<div>
									<p
										className="font-bold text-sm"
										style={{ color: "var(--text-primary)" }}
									>
										Trip #{t.id} — {t.bus.number}
									</p>
									<p className="text-xs" style={{ color: "var(--text-muted)" }}>
										{t.departureDate} at {t.departureTime24} •{" "}
										{t.bus.origin} → {t.bus.destination}
									</p>
								</div>
								<button
									type="button"
									onClick={() => handleActivate(t.id)}
									disabled={isPending || !!activeTrip}
									className="shrink-0 border-2 px-3 py-1 text-xs font-bold uppercase neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-none"
									style={{
										background: "var(--cta-bg)",
										color: "var(--color-navy)",
										borderColor: "var(--text-primary)",
									}}
								>
									{activeTrip ? "Trip Active" : "Start Trip"}
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{scheduledTrips.length === 0 && !activeTrip && (
				<div
					className="border-2 p-6 text-center"
					style={{ borderStyle: "dashed", borderColor: "var(--border-medium)" }}
				>
					<p className="text-sm font-bold uppercase" style={{ color: "var(--text-muted)" }}>
						No scheduled trips found
					</p>
					<p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
						Ask your operator to schedule a trip for your bus.
					</p>
				</div>
			)}

			{/* ── Recent Trip Reports ────────────────────────────── */}
			{reports.length > 0 && (
				<div
					className="border-2 p-4 space-y-3"
					style={{
						borderColor: "var(--text-primary)",
						background: "var(--bg-surface)",
					}}
				>
					<h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
						Recent Trip Reports
					</h2>
					<div className="overflow-x-auto">
						<table
							className="w-full text-sm"
							style={{ borderCollapse: "collapse" }}
						>
							<thead>
								<tr
									style={{
										background: "var(--bg-surface-2)",
										borderBottom: "2px solid var(--text-primary)",
									}}
								>
									{["Trip #", "Bus", "Passengers", "Digital", "Cash", "Revenue", "Date"].map(
										(h) => (
											<th
												key={h}
												className="text-left px-3 py-2 text-xs font-bold uppercase"
												style={{ color: "var(--text-muted)" }}
											>
												{h}
											</th>
										),
									)}
								</tr>
							</thead>
							<tbody>
								{reports.map((r) => (
									<tr
										key={r.id}
										style={{ borderBottom: "1px solid var(--border-default)" }}
									>
										<td className="px-3 py-2 font-mono font-bold" style={{ color: "var(--text-primary)" }}>
											#{r.tripId ?? "—"}
										</td>
										<td className="px-3 py-2 text-xs" style={{ color: "var(--text-secondary)" }}>
											{r.busId ?? "—"}
										</td>
										<td className="px-3 py-2 font-bold" style={{ color: "var(--text-primary)" }}>
											{r.totalPassengers}
										</td>
										<td className="px-3 py-2 text-xs" style={{ color: "var(--color-teal)" }}>
											{r.digitalTickets}
										</td>
										<td className="px-3 py-2 text-xs" style={{ color: "var(--text-secondary)" }}>
											{r.cashTickets}
										</td>
										<td
											className="px-3 py-2 font-bold"
											style={{ color: "var(--color-amber)" }}
										>
											₹{Number(r.totalRevenueInr).toLocaleString("en-IN")}
										</td>
										<td className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
											{new Date(r.createdAt).toLocaleDateString("en-IN", {
												day: "numeric",
												month: "short",
											})}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
