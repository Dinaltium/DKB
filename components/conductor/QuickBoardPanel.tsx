"use client";

// Conductor-side Pending column for Quick Board tickets.
//
// Polls /api/quick-board/pending every 10s for the given trip. Each card
// shows ticket UID, passenger fragment, ₹, grace-window countdown, and a
// verification-tier colour. The destination-set button only appears when
// the ticket is still in pending_fare (passenger boarded via
// "let conductor set"). Recently-confirmed tickets flash green briefly.
//
// Verification tier colours:
//   🟢 paid + UTR present
//   🟠 fare set, awaiting UPI payment (yellow border, no UTR yet)
//   🔵 pending fare (conductor needs to pick destination)
//   🔴 grace expired — server already flipped to cancelled, kept here 60s
//      for visibility, not actionable

import { Clock, IndianRupee, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PendingTicket {
	id: number;
	ticketUid: string;
	fromStopName: string;
	toStopName: string;
	seatCount: number;
	finalFareInr: string;
	paymentStatus: string;
	expiresAt: string | null;
	createdAt: string;
}

interface StopOption {
	id: number;
	stopName: string;
	stopOrder: number;
}

interface PanelProps {
	tripId: number;
	stops: StopOption[];
}

export function QuickBoardPanel({ tripId, stops }: PanelProps) {
	const [pending, setPending] = useState<PendingTicket[]>([]);
	const [recent, setRecent] = useState<PendingTicket[]>([]);
	const [pickFor, setPickFor] = useState<string | null>(null);
	const [busy, setBusy] = useState<string | null>(null);
	const [now, setNow] = useState<number>(() => Date.now());

	const load = useCallback(async () => {
		const res = await fetch(`/api/quick-board/pending?tripId=${tripId}`).then(
			(r) => r.json(),
		);
		if (res.success) {
			setPending(res.data.pending);
			setRecent(res.data.recent);
		}
	}, [tripId]);

	useEffect(() => {
		load();
		const poll = setInterval(load, 10_000);
		const tick = setInterval(() => setNow(Date.now()), 1000);
		return () => {
			clearInterval(poll);
			clearInterval(tick);
		};
	}, [load]);

	async function setDestination(uid: string, toStopId: number) {
		setBusy(uid);
		await fetch(`/api/quick-board/${uid}/set-destination`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ toStopId }),
		});
		setBusy(null);
		setPickFor(null);
		load();
	}

	function tierColor(p: PendingTicket) {
		if (p.paymentStatus === "pending") return "border-blue-500";
		if (p.paymentStatus === "initiated") return "border-amber-500";
		return "border-foreground";
	}

	function remainingSec(expiresAt: string | null): number {
		if (!expiresAt) return 0;
		return Math.max(
			0,
			Math.floor((new Date(expiresAt).getTime() - now) / 1000),
		);
	}

	function fmt(s: number): string {
		const m = String(Math.floor(s / 60)).padStart(2, "0");
		const r = String(s % 60).padStart(2, "0");
		return `${m}:${r}`;
	}

	return (
		<div
			className="theme-panel rounded-none border-2 p-4 neo-shadow"
			style={{ borderColor: "var(--border-default)" }}
		>
			<div className="mb-3 flex items-center justify-between">
				<h3
					className="text-xl font-black uppercase tracking-wide"
					style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
				>
					Quick Board · Pending ({pending.length})
				</h3>
				<button
					onClick={load}
					className="theme-btn-secondary brutal-transition brutal-hover h-8 rounded-none border-2 px-3 text-[11px] font-black uppercase tracking-widest neo-shadow"
				>
					Refresh
				</button>
			</div>

			{pending.length === 0 && recent.length === 0 && (
				<p
					className="py-6 text-center text-xs font-bold uppercase tracking-widest"
					style={{ color: "var(--text-muted)" }}
				>
					No pending tickets
				</p>
			)}

			<ul className="space-y-2">
				{pending.map((p) => {
					const sec = remainingSec(p.expiresAt);
					const danger = sec < 60;
					return (
						<li
							key={p.id}
							className={`rounded-none border-2 p-3 ${tierColor(p)}`}
							style={{ background: "var(--bg-surface-2)" }}
						>
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									<span className="font-mono text-xs font-bold">
										{p.ticketUid}
									</span>
									{p.paymentStatus === "pending" && (
										<span className="rounded-none border-2 border-blue-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600">
											needs dest
										</span>
									)}
									{p.paymentStatus === "initiated" && (
										<span className="rounded-none border-2 border-amber-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600">
											awaiting UPI
										</span>
									)}
								</div>
								<span
									className={`font-mono text-sm font-black ${
										danger ? "text-red-600" : ""
									}`}
								>
									<Clock className="mr-1 inline h-3 w-3" />
									{fmt(sec)}
								</span>
							</div>

							<div className="mt-1.5 flex items-center gap-1 text-xs">
								<MapPin className="h-3 w-3" />
								<span className="font-bold">{p.fromStopName}</span>
								<span>→</span>
								<span className="font-bold">{p.toStopName}</span>
								<span
									className="ml-auto font-mono font-black"
									style={{ color: "var(--text-primary)" }}
								>
									<IndianRupee className="inline h-3 w-3" />
									{Number(p.finalFareInr).toFixed(0)} · {p.seatCount}seat
								</span>
							</div>

							{p.paymentStatus === "pending" && (
								<div className="mt-2">
									{pickFor === p.ticketUid ? (
										<div className="flex gap-2">
											<select
												onChange={(e) => {
													const v = Number(e.target.value);
													if (v) setDestination(p.ticketUid, v);
												}}
												disabled={busy === p.ticketUid}
												className="theme-input h-9 flex-1 rounded-none border-2 px-2 text-xs font-bold"
											>
												<option value="">— pick destination —</option>
												{stops.map((s) => (
													<option key={s.id} value={s.id}>
														{s.stopOrder + 1}. {s.stopName}
													</option>
												))}
											</select>
											<button
												onClick={() => setPickFor(null)}
												className="theme-btn-secondary h-9 rounded-none border-2 px-3 text-[11px] font-black uppercase tracking-widest neo-shadow"
											>
												X
											</button>
										</div>
									) : (
										<button
											onClick={() => setPickFor(p.ticketUid)}
											className="theme-btn-primary brutal-transition brutal-hover h-9 rounded-none border-2 px-3 text-[11px] font-black uppercase tracking-widest neo-shadow"
										>
											Set destination →
										</button>
									)}
								</div>
							)}
						</li>
					);
				})}

				{recent.map((p) => (
					<li
						key={`r-${p.id}`}
						className="rounded-none border-2 border-green-500 p-3"
						style={{ background: "var(--bg-surface-2)" }}
					>
						<div className="flex items-center justify-between">
							<span className="font-mono text-xs font-bold text-green-700">
								✓ {p.ticketUid}
							</span>
							<span className="font-mono text-sm font-black text-green-700">
								<IndianRupee className="inline h-3 w-3" />
								{Number(p.finalFareInr).toFixed(0)} paid
							</span>
						</div>
						<div
							className="mt-1 text-[11px]"
							style={{ color: "var(--text-muted)" }}
						>
							{p.fromStopName} → {p.toStopName}
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
