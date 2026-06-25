"use client";

// Passenger Quick Board page.
//
// Three boarding paths:
//   - PICK-DEST     : passenger picks destination at boarding (deterministic fare).
//   - CONDUCTOR-SETS: passenger boards, conductor picks destination on their app.
//                     Useful in rushed cases where passenger can't tap fast.
//
// Then the deferred-pay loop:
//   1. Server returns a UPI intent URL + 15-min grace window.
//   2. Passenger taps PAY → opens UPI app (real mode) or fake approve (mock mode).
//   3. After payment, passenger pastes the UTR back into the app.
//   4. Ticket flips PAID. Conductor's screen turns green.
//
// PAYMENT MODE
//   NEXT_PUBLIC_PAYMENT_MODE=mock (default) → upi:// is replaced with mock-upi://
//   which this page intercepts to show a fake approve screen.
//   NEXT_PUBLIC_PAYMENT_MODE=real → real upi:// intent, opens GPay/PhonePe/Paytm.

import { AppShell } from "@/components/layout/AppShell";
import { getPlatform, isNative } from "@/lib/native";
import { getPaymentMode, toNativeLaunchUrl } from "@/lib/upi";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Copy,
	IndianRupee,
	Loader2,
	Radio,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface TripStop {
	id: number;
	routeId: number;
	stopName: string;
	stopOrder: number;
}
interface ActiveTrip {
	tripId: number;
	busId: string;
	busNumber: string;
	routeId: number;
	routeName: string;
	origin: string;
	destination: string;
	stops: TripStop[];
}

type Stage = "select" | "pending_fare" | "awaiting_pay" | "paid";

interface TicketState {
	uid: string;
	fareInr: number;
	upiIntent: string | null;
	operatorVpa: string;
	operatorName: string;
	expiresAt: string;
	needsDestination: boolean;
}

export default function QuickBoardPage() {
	const mode = getPaymentMode();
	const [trips, setTrips] = useState<ActiveTrip[]>([]);
	const [loadingTrips, setLoadingTrips] = useState(true);

	const [stage, setStage] = useState<Stage>("select");
	const [tripId, setTripId] = useState<number | null>(null);
	const [fromStopId, setFromStopId] = useState<number | null>(null);
	const [toStopId, setToStopId] = useState<number | null>(null);
	const [letConductorSet, setLetConductorSet] = useState(false);
	const [seatCount, setSeatCount] = useState(1);
	const [submitting, setSubmitting] = useState(false);

	const [ticket, setTicket] = useState<TicketState | null>(null);
	const [utr, setUtr] = useState("");
	const [capturing, setCapturing] = useState(false);

	const selectedTrip = useMemo(
		() => trips.find((t) => t.tripId === tripId) ?? null,
		[trips, tripId],
	);

	// Fetch active trips once.
	useEffect(() => {
		fetch("/api/quick-board/trips")
			.then((r) => r.json())
			.then((r) => {
				if (r.success) setTrips(r.data);
			})
			.finally(() => setLoadingTrips(false));
	}, []);

	// Countdown timer for grace window.
	const [remainingSec, setRemainingSec] = useState(0);
	useEffect(() => {
		if (!ticket?.expiresAt || stage === "paid") return;
		const tick = () => {
			const ms = new Date(ticket.expiresAt).getTime() - Date.now();
			setRemainingSec(Math.max(0, Math.floor(ms / 1000)));
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [ticket?.expiresAt, stage]);

	async function startBoarding() {
		if (!tripId || !fromStopId) {
			toast.error("Pick trip and boarding stop");
			return;
		}
		if (!letConductorSet && !toStopId) {
			toast.error("Pick destination or check 'let conductor set'");
			return;
		}
		setSubmitting(true);
		try {
			const res = await fetch("/api/quick-board/start", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					tripId,
					fromStopId,
					toStopId: letConductorSet ? undefined : toStopId,
					seatCount,
				}),
			});
			const data = await res.json();
			if (!data.success) {
				toast.error(data.error ?? "Failed");
				return;
			}
			const t: TicketState = {
				uid: data.data.ticket.ticketUid,
				fareInr: data.data.fareInr,
				upiIntent: data.data.upiIntent,
				operatorVpa: data.data.operatorVpa,
				operatorName: data.data.operatorName,
				expiresAt:
					data.data.ticket.expiresAt ??
					data.data.expiresAt ??
					new Date().toISOString(),
				needsDestination: data.data.needsDestination,
			};
			setTicket(t);
			setStage(t.needsDestination ? "pending_fare" : "awaiting_pay");
		} catch (err) {
			console.error(err);
			toast.error("Network error");
		} finally {
			setSubmitting(false);
		}
	}

	function launchUpi() {
		if (!ticket?.upiIntent) return;
		if (mode === "mock") {
			// Mock path: open internal fake-approve page. Same on web + native.
			window.location.href = `/quick-board/mock-pay/${ticket.uid}`;
			return;
		}
		// Real path: hand off to OS-level UPI handler. On native Android the
		// Capacitor WebView blocks non-http schemes, so we rewrite upi:// into
		// the intent:// form that Android intercepts and routes to the chooser.
		const platform = isNative() ? getPlatform() : "web";
		const launchUrl = toNativeLaunchUrl(ticket.upiIntent, platform);
		window.location.href = launchUrl;
	}

	async function submitUtr() {
		if (!ticket) return;
		const cleaned = utr.trim();
		if (cleaned.length < 6) {
			toast.error("UTR looks too short");
			return;
		}
		setCapturing(true);
		try {
			const res = await fetch(`/api/quick-board/${ticket.uid}/capture-utr`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ utr: cleaned }),
			});
			const data = await res.json();
			if (!data.success) {
				toast.error(data.error ?? "Failed");
				return;
			}
			setStage("paid");
			toast.success("Payment captured");
		} finally {
			setCapturing(false);
		}
	}

	const modeBadge =
		mode === "mock" ? (
			<span className="inline-flex items-center gap-1.5 rounded-none border-2 border-foreground bg-yellow-300 px-2 py-1 text-[11px] font-black uppercase tracking-widest text-yellow-950">
				<AlertCircle className="h-3 w-3" /> Test Mode
			</span>
		) : (
			<span className="theme-bg-amber inline-flex items-center gap-1.5 rounded-none border-2 border-foreground px-2 py-1 text-[11px] font-black uppercase tracking-widest">
				<Radio className="h-3 w-3 animate-pulse" /> Live UPI
			</span>
		);

	return (
		<AppShell title="Quick Board" subtitle="Deferred-pay UPI ticket flow">
			<div className="mb-4 flex items-center gap-2">{modeBadge}</div>

			{stage === "select" && (
				<section
					className="theme-panel rounded-none border-2 p-5 neo-shadow md:p-7"
					style={{ borderColor: "var(--border-default)" }}
				>
					{loadingTrips ? (
						<p style={{ color: "var(--text-muted)" }}>Loading trips…</p>
					) : trips.length === 0 ? (
						<p style={{ color: "var(--text-muted)" }}>
							No active trips. Start one from the operator dashboard first.
						</p>
					) : (
						<div className="space-y-5">
							<div>
								<label className="mb-1 block text-xs font-black uppercase tracking-widest">
									Trip
								</label>
								<select
									value={tripId ?? ""}
									onChange={(e) => {
										setTripId(Number(e.target.value));
										setFromStopId(null);
										setToStopId(null);
									}}
									className="theme-input h-11 w-full rounded-none border-2 px-3 text-sm font-bold"
								>
									<option value="">— pick trip —</option>
									{trips.map((t) => (
										<option key={t.tripId} value={t.tripId}>
											Bus {t.busNumber} · {t.origin} → {t.destination} ·{" "}
											{t.routeName}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="mb-1 block text-xs font-black uppercase tracking-widest">
									Boarding stop
								</label>
								<select
									disabled={!selectedTrip}
									value={fromStopId ?? ""}
									onChange={(e) => setFromStopId(Number(e.target.value))}
									className="theme-input h-11 w-full rounded-none border-2 px-3 text-sm font-bold disabled:opacity-50"
								>
									<option value="">— pick boarding stop —</option>
									{selectedTrip?.stops.map((s) => (
										<option key={s.id} value={s.id}>
											{s.stopOrder + 1}. {s.stopName}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
									<input
										type="checkbox"
										checked={letConductorSet}
										onChange={(e) => setLetConductorSet(e.target.checked)}
										className="h-4 w-4"
									/>
									In a rush — let conductor set destination
								</label>
								{!letConductorSet && (
									<select
										disabled={!selectedTrip || !fromStopId}
										value={toStopId ?? ""}
										onChange={(e) => setToStopId(Number(e.target.value))}
										className="theme-input h-11 w-full rounded-none border-2 px-3 text-sm font-bold disabled:opacity-50"
									>
										<option value="">— pick destination —</option>
										{selectedTrip?.stops
											.filter(
												(s) =>
													fromStopId != null &&
													s.stopOrder >
														(selectedTrip.stops.find((x) => x.id === fromStopId)
															?.stopOrder ?? -1),
											)
											.map((s) => (
												<option key={s.id} value={s.id}>
													{s.stopOrder + 1}. {s.stopName}
												</option>
											))}
									</select>
								)}
							</div>

							<div>
								<label className="mb-1 block text-xs font-black uppercase tracking-widest">
									Seats
								</label>
								<input
									type="number"
									min={1}
									max={6}
									value={seatCount}
									onChange={(e) => setSeatCount(Number(e.target.value) || 1)}
									className="theme-input h-11 w-20 rounded-none border-2 px-3 text-sm font-bold"
								/>
							</div>

							<button
								onClick={startBoarding}
								disabled={submitting}
								className="theme-btn-primary brutal-transition brutal-hover inline-flex h-11 items-center gap-2 rounded-none border-2 px-5 text-sm font-black uppercase tracking-wide neo-shadow disabled:opacity-50"
							>
								{submitting ? (
									<>
										<Loader2 className="h-4 w-4 animate-spin" /> Boarding…
									</>
								) : (
									<>Quick Board →</>
								)}
							</button>
						</div>
					)}
				</section>
			)}

			{stage === "pending_fare" && ticket && (
				<section
					className="theme-panel rounded-none border-2 p-5 neo-shadow md:p-7"
					style={{ borderColor: "var(--border-default)" }}
				>
					<div className="mb-3 flex items-center gap-2">
						<Clock className="h-5 w-5" />
						<h2
							className="text-2xl font-black uppercase tracking-wide"
							style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
						>
							Awaiting conductor
						</h2>
					</div>
					<p className="text-sm" style={{ color: "var(--text-secondary)" }}>
						You boarded. Conductor sees you in their Pending column. As soon as
						they set your destination, your fare + UPI payment will show up
						here.
					</p>
					<CountdownBar seconds={remainingSec} />
					<p
						className="mt-3 text-xs font-bold uppercase tracking-widest"
						style={{ color: "var(--text-muted)" }}
					>
						Ticket: {ticket.uid}
					</p>
					<button
						onClick={() => window.location.reload()}
						className="theme-btn-secondary brutal-transition brutal-hover mt-4 inline-flex h-10 items-center rounded-none border-2 px-4 text-xs font-black uppercase tracking-widest neo-shadow"
					>
						Refresh
					</button>
				</section>
			)}

			{stage === "awaiting_pay" && ticket && (
				<section
					className="theme-panel rounded-none border-2 p-5 neo-shadow md:p-7"
					style={{ borderColor: "var(--border-default)" }}
				>
					<div className="mb-3 flex items-center gap-2">
						<IndianRupee className="h-5 w-5" />
						<h2
							className="text-2xl font-black uppercase tracking-wide"
							style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
						>
							Pay ₹{ticket.fareInr}
						</h2>
					</div>
					<p className="text-xs" style={{ color: "var(--text-muted)" }}>
						To {ticket.operatorName} · <code>{ticket.operatorVpa}</code>
					</p>
					<CountdownBar seconds={remainingSec} />

					<button
						onClick={launchUpi}
						className="theme-btn-primary brutal-transition brutal-hover mt-5 inline-flex h-12 items-center gap-2 rounded-none border-2 px-6 text-base font-black uppercase tracking-wide neo-shadow"
					>
						Pay ₹{ticket.fareInr} via UPI →
					</button>

					<div className="mt-6 border-t-2 border-dashed border-foreground/20 pt-4">
						<label className="mb-1 block text-xs font-black uppercase tracking-widest">
							UTR (transaction reference)
						</label>
						<p
							className="mb-2 text-[11px]"
							style={{ color: "var(--text-muted)" }}
						>
							After payment, copy the 12-digit UTR from your UPI app and paste
							here.
						</p>
						<div className="flex gap-2">
							<input
								value={utr}
								onChange={(e) => setUtr(e.target.value)}
								placeholder="000000000000"
								maxLength={24}
								className="theme-input h-11 flex-1 rounded-none border-2 px-3 font-mono text-sm font-bold"
							/>
							<button
								onClick={submitUtr}
								disabled={capturing || utr.trim().length < 6}
								className="theme-btn-dark brutal-transition brutal-hover inline-flex h-11 items-center rounded-none border-2 px-4 text-xs font-black uppercase tracking-widest neo-shadow disabled:opacity-50"
							>
								{capturing ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Submit"
								)}
							</button>
						</div>
					</div>
				</section>
			)}

			{stage === "paid" && ticket && (
				<section
					className="theme-panel rounded-none border-2 p-5 neo-shadow md:p-7"
					style={{ borderColor: "var(--border-default)" }}
				>
					<div className="mb-3 flex items-center gap-2">
						<CheckCircle2 className="h-6 w-6 text-green-600" />
						<h2
							className="text-2xl font-black uppercase tracking-wide"
							style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
						>
							Paid · ₹{ticket.fareInr}
						</h2>
					</div>
					<p style={{ color: "var(--text-secondary)" }}>
						Ticket <code className="font-mono font-bold">{ticket.uid}</code> is
						valid for 24 h. Show this screen to the conductor on request.
					</p>
					<button
						onClick={() => {
							navigator.clipboard.writeText(ticket.uid);
							toast.success("Ticket UID copied");
						}}
						className="theme-btn-secondary brutal-transition brutal-hover mt-4 inline-flex h-10 items-center gap-2 rounded-none border-2 px-4 text-xs font-black uppercase tracking-widest neo-shadow"
					>
						<Copy className="h-3 w-3" /> Copy ticket
					</button>
				</section>
			)}
		</AppShell>
	);
}

function CountdownBar({ seconds }: { seconds: number }) {
	const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
	const ss = String(seconds % 60).padStart(2, "0");
	const pct = Math.min(100, (seconds / (15 * 60)) * 100);
	const danger = seconds < 60;
	return (
		<div className="mt-4">
			<div className="flex items-baseline justify-between">
				<span className="text-[11px] font-black uppercase tracking-widest">
					Grace window
				</span>
				<span
					className={`font-mono text-lg font-black ${
						danger ? "text-red-600" : ""
					}`}
				>
					{mm}:{ss}
				</span>
			</div>
			<div
				className="mt-1 h-2 w-full rounded-none border-2 border-foreground"
				style={{ background: "var(--bg-surface-3)" }}
			>
				<div
					className={`h-full ${danger ? "bg-red-600" : "theme-bg-teal"}`}
					style={{ width: `${pct}%`, transition: "width 1s linear" }}
				/>
			</div>
		</div>
	);
}
