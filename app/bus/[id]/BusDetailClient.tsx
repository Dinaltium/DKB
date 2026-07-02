"use client";

import { ComplaintDialog } from "@/components/modals/ComplaintDialog";
import { PaymentDrawer } from "@/components/modals/PaymentDrawer";
import { castVoteAction } from "@/lib/actions/bus";
import type { Bus, Stop } from "@/lib/db/schema";
import { Clock4, MapPin, QrCode, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

const BusMap = dynamic(() => import("@/components/maps/BusMap"), {
	ssr: false,
});

const VOTE_ITEMS = [
	{ key: "onTime", label: "On Time" },
	{ key: "slightlyLate", label: "Slightly Late" },
	{ key: "veryLate", label: "Very Late" },
] as const;

type VoteKey = "onTime" | "slightlyLate" | "veryLate";

interface Props {
	bus: Bus;
	stops: Stop[];
	fareTable: { stop: string; fare: number }[];
	currentStopName: string;
	session: { id: string; role: string } | null;
}

export function BusDetailClient({
	bus,
	stops,
	fareTable,
	currentStopName,
	session,
}: Props) {
	const [votes, setVotes] = useState(bus.votes as Record<VoteKey, number>);
	const [qrDataUrl, setQrDataUrl] = useState("");
	const [isPending, startTransition] = useTransition();

	// Generate QR code client-side
	useEffect(() => {
		const url = `${window.location.origin}/bus/${bus.id}`;
		import("qrcode").then(({ default: QRCode }) => {
			QRCode.toDataURL(url, { width: 170, margin: 1 })
				.then(setQrDataUrl)
				.catch(() => {});
		});
	}, [bus.id]);

	const castVote = (key: VoteKey) => {
		setVotes((prev) => ({ ...prev, [key]: prev[key] + 1 }));
		startTransition(async () => {
			const result = await castVoteAction(bus.id, key);
			if (!result.success) toast.error("Failed to record vote");
			else toast.success("Thanks for your update!");
		});
	};

	const statusStyle = (s: string) => {
		if (s === "Running")
			return {
				background: "var(--status-running-bg)",
				color: "var(--status-running-text)",
				border: "2px solid var(--status-running-border)",
			};
		if (s === "Delayed")
			return {
				background: "var(--status-delayed-bg)",
				color: "var(--status-delayed-text)",
				border: "2px solid var(--status-delayed-border)",
			};
		return {
			background: "var(--status-stopped-bg)",
			color: "var(--status-stopped-text)",
			border: "2px solid var(--status-stopped-border)",
		};
	};

	const cardStyle = {
		background: "var(--bg-surface)",
		borderColor: "var(--border-default)",
	};

	return (
		<>
			{/* ── Hero grid ── */}
			<section className="grid gap-4 md:grid-cols-2">
				<div
					className="ticket-stub rounded-none border-2 p-5 neo-shadow"
					style={cardStyle}
				>
					<p
						className="text-4xl font-extrabold uppercase"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							color: "var(--text-primary)",
						}}
					>
						{bus.number}
					</p>
					<div
						className="mt-3 space-y-1.5 text-sm"
						style={{ color: "var(--text-secondary)" }}
					>
						<p>License: {bus.licensePlate}</p>
						<p>Driver: {bus.driverName}</p>
						<p>Conductor: {bus.conductorName}</p>
						<p>
							Route: {bus.origin} → {bus.destination}
						</p>
						<p>
							Boarding from:{" "}
							<strong style={{ color: "var(--text-primary)" }}>
								{currentStopName}
							</strong>
						</p>
						<div
							className="mt-2 inline-flex rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide"
							style={statusStyle(bus.status)}
						>
							{bus.status}
						</div>
					</div>
				</div>

				<div className="rounded-none border-2 p-5 neo-shadow" style={cardStyle}>
					<p
						className="text-3xl font-extrabold uppercase"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							color: "var(--text-primary)",
						}}
					>
						Schedule & Notice
					</p>
					<div className="mt-3 space-y-3 text-sm">
						<div className="flex flex-wrap gap-2">
							{(bus.schedule as string[]).map((slot) => (
								<span
									key={slot}
									className="rounded-none border-2 px-2 py-1 text-xs font-bold uppercase tracking-wide"
									style={{
										background: "var(--bg-surface-2)",
										borderColor: "var(--border-default)",
										color: "var(--text-secondary)",
									}}
								>
									{slot}
								</span>
							))}
						</div>
						<p
							className="rounded-none border-2 p-2 text-xs font-bold uppercase tracking-wide"
							style={{
								background: "var(--status-delayed-bg)",
								borderColor: "var(--status-delayed-border)",
								color: "var(--status-delayed-text)",
							}}
						>
							{bus.statusNote}
						</p>
						<p className="text-sm" style={{ color: "var(--text-secondary)" }}>
							Student BusChalo Card:{" "}
							{bus.studentCardAccepted ? (
								<span className="theme-text-teal font-bold uppercase tracking-wide">
									Accepted · {bus.studentDiscountPercent}% discount
								</span>
							) : (
								<span style={{ color: "var(--text-muted)" }}>Not Accepted</span>
							)}
						</p>
					</div>
				</div>
			</section>

			{/* ── Map ── */}
			<section className="mt-6">
				<BusMap stops={stops} />
			</section>

			{/* ── Route stops (expected order) ── */}
			{stops.length > 0 && (
				<section className="mt-6">
					<div
						className="rounded-none border-2 p-5 neo-shadow"
						style={cardStyle}
					>
						<p
							className="text-3xl font-extrabold uppercase"
							style={{
								fontFamily: "'Barlow Condensed', sans-serif",
								color: "var(--text-primary)",
							}}
						>
							Route Stops
						</p>
						<p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
							Expected stops in order. Timings may vary — this is not live
							tracking.
						</p>
						<ol className="mt-4 space-y-0">
							{stops.map((stop, idx) => {
								const isTerminus = idx === 0 || idx === stops.length - 1;
								return (
									<li key={stop.id} className="flex items-stretch gap-3">
										{/* Timeline rail */}
										<div className="flex flex-col items-center">
											<span
												className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black"
												style={{
													background: isTerminus
														? "var(--color-navy)"
														: "var(--bg-surface-2)",
													color: isTerminus
														? "var(--text-inverse)"
														: "var(--text-primary)",
													borderColor: "var(--border-default)",
												}}
											>
												{idx + 1}
											</span>
											{idx < stops.length - 1 && (
												<span
													className="w-0.5 flex-1"
													style={{ background: "var(--border-default)" }}
												/>
											)}
										</div>
										<div className="pb-4 pt-0.5">
											<p
												className="text-sm font-semibold"
												style={{ color: "var(--text-primary)" }}
											>
												{stop.name}
											</p>
											{isTerminus && (
												<span className="theme-text-teal text-[10px] font-bold uppercase tracking-widest">
													<MapPin className="mr-1 inline h-3 w-3" />
													{idx === 0 ? "Origin" : "Destination"}
												</span>
											)}
										</div>
									</li>
								);
							})}
						</ol>
					</div>
				</section>
			)}

			{/* ── Fare + crowd ── */}
			<section className="mt-6 grid gap-4 md:grid-cols-2">
				<div className="rounded-none border-2 p-5 neo-shadow" style={cardStyle}>
					<p
						className="text-3xl font-extrabold uppercase"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							color: "var(--text-primary)",
						}}
					>
						Fare from {currentStopName}
					</p>
					<div className="mt-3 space-y-2">
						{fareTable.length === 0 ? (
							<p className="text-sm" style={{ color: "var(--text-muted)" }}>
								Stop not on this route. Full fare: ₹{bus.fullFare}
							</p>
						) : (
							fareTable.map((row) => (
								<div
									key={row.stop}
									className="flex items-center justify-between rounded-none border-2 px-3 py-2 text-sm"
									style={{
										borderColor: "var(--border-default)",
										color: "var(--text-secondary)",
									}}
								>
									<span>{row.stop}</span>
									<span className="theme-text-teal font-semibold">
										₹{row.fare}
									</span>
								</div>
							))
						)}
					</div>
				</div>

				<div className="rounded-none border-2 p-5 neo-shadow" style={cardStyle}>
					<p
						className="text-3xl font-extrabold uppercase"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							color: "var(--text-primary)",
						}}
					>
						Live Crowd Status
					</p>
					<div className="mt-3 space-y-3">
						{VOTE_ITEMS.map((item) => (
							<div
								key={item.key}
								className="flex items-center justify-between gap-3"
							>
								<p
									className="text-sm"
									style={{ color: "var(--text-secondary)" }}
								>
									{item.label}:{" "}
									<strong style={{ color: "var(--text-primary)" }}>
										{votes[item.key]}
									</strong>
								</p>
								<button
									onClick={() => castVote(item.key)}
									disabled={isPending}
									className="theme-btn-secondary brutal-transition brutal-hover h-9 rounded-none border-2 border-foreground px-3 text-xs font-bold uppercase tracking-wide neo-shadow hover:opacity-80 disabled:opacity-50"
									style={{
										color: "var(--text-primary)",
									}}
								>
									Vote
								</button>
							</div>
						))}

						<div
							className="rounded-none border-2 border-foreground p-3 text-sm font-semibold"
							style={{
								background: "var(--bg-surface-2)",
								color: "var(--text-secondary)",
							}}
						>
							Women Reserved: {bus.womenReservedAvailable} /{" "}
							{bus.womenReservedTotal}
						</div>
						<div
							className="rounded-none border-2 border-foreground p-3 text-sm font-semibold"
							style={{
								background: "var(--bg-surface-2)",
								color: "var(--text-secondary)",
							}}
						>
							<Users className="mr-2 inline-block h-4 w-4" />
							Available Seats: {bus.totalSeats - bus.occupiedSeats} /{" "}
							{bus.totalSeats}
						</div>
					</div>
				</div>
			</section>

			{/* ── QR ── */}
			<section className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
				<div
					className="flex flex-col items-center rounded-none border-2 p-4 neo-shadow"
					style={cardStyle}
				>
					<QrCode
						className="mb-2 h-5 w-5"
						style={{ color: "var(--text-primary)" }}
					/>
					{qrDataUrl ? (
						<img
							src={qrDataUrl}
							alt={`QR for bus ${bus.number}`}
							width={170}
							height={170}
							className="rounded-none border-2 border-foreground"
						/>
					) : (
						<div
							className="flex h-[170px] w-[170px] items-center justify-center rounded-none border-2 border-foreground text-xs font-bold uppercase tracking-wide"
							style={{
								background: "var(--bg-surface-2)",
								color: "var(--text-muted)",
							}}
						>
							Generating...
						</div>
					)}
				</div>

				<div className="rounded-none border-2 p-5 neo-shadow" style={cardStyle}>
					<div
						className="space-y-3 text-sm"
						style={{ color: "var(--text-secondary)" }}
					>
						<p>
							Print this QR and place inside the bus for instant passenger
							access — no app required.
						</p>
						<p>
							Full Route Fare:{" "}
							<strong className="theme-text-teal">₹{bus.fullFare}</strong>
						</p>
						<p>
							<Clock4 className="mr-2 inline h-4 w-4" />
							Votes and status refresh in real time.
						</p>
						{!session && (
							<p
								className="rounded-none border-2 border-foreground p-2 text-xs font-medium normal-case tracking-normal"
								style={{ background: "var(--bg-surface-2)" }}
							>
								<a
									href="/auth"
									className="theme-text-teal font-bold uppercase tracking-wide hover:underline"
								>
									Sign in
								</a>{" "}
								to save this trip to your travel history.
							</p>
						)}
					</div>
				</div>
			</section>

			{/* ── Sticky action bar ── */}
			<div
				className="fixed bottom-16 left-0 right-0 z-30 flex items-center justify-center gap-2 border-t-2 border-foreground px-4 py-3 backdrop-blur-md md:bottom-4 md:left-auto md:right-4 md:w-auto md:rounded-none md:border-2 md:border-foreground md:neo-shadow"
				style={{ background: "var(--header-bg)" }}
			>
				<PaymentDrawer
					busId={bus.id}
					busNumber={bus.number}
					amount={bus.fullFare}
				/>
				<ComplaintDialog busId={bus.id} busNumber={bus.number} />
			</div>
		</>
	);
}
