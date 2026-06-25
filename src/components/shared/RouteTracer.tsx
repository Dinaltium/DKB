// app/components/RouteTracer.tsx
"use client";

import { watchPosition } from "@/lib/native";
import { useEffect, useRef, useState } from "react";

interface TracePoint {
	lat: number;
	lng: number;
	timestamp: number;
}

interface RouteTracerProps {
	busId: string;
	onSave: (points: TracePoint[]) => void;
}

export function RouteTracer({ busId, onSave }: RouteTracerProps) {
	const [tracing, setTracing] = useState(false);
	const [points, setPoints] = useState<TracePoint[]>([]);
	const [error, setError] = useState<string>("");
	// Holds the watcher cleanup fn returned by the native helper. null when
	// not tracing. A ref because the unmount effect must reach the latest one.
	const stopWatchRef = useRef<(() => void) | null>(null);
	// Synchronous mirror of `tracing` so the async watch callback can detect a
	// stop that happened before the watchPosition promise resolved.
	const tracingRef = useRef(false);

	async function startTrace() {
		setPoints([]);
		setTracing(true);
		tracingRef.current = true;
		setError("");

		// watchPosition resolves to a cleanup fn. On native it routes through
		// the Capacitor Geolocation plugin (with permission prompt); on web it
		// falls back to navigator.geolocation. Both feed the same callback.
		try {
			const stop = await watchPosition((pos) => {
				setPoints((prev) => [
					...prev,
					{
						lat: pos.lat,
						lng: pos.lng,
						timestamp: pos.timestamp,
					},
				]);
			});
			// Tracing may have been stopped before the promise resolved.
			if (!tracingRef.current) {
				stop();
				return;
			}
			stopWatchRef.current = stop;
		} catch (err) {
			setError(
				`GPS error: ${err instanceof Error ? err.message : String(err)}`,
			);
			setTracing(false);
			tracingRef.current = false;
		}
	}

	function stopTrace() {
		if (stopWatchRef.current !== null) {
			stopWatchRef.current();
			stopWatchRef.current = null;
		}
		tracingRef.current = false;
		setTracing(false);

		// Simplify points — keep every 5th point to reduce noise
		// while maintaining enough detail to follow the road
		const simplified = points.filter((_, idx) => idx % 5 === 0);
		onSave(simplified);

		// Save to localStorage keyed by busId
		try {
			const all = JSON.parse(
				localStorage.getItem("buslink_route_geometry") ?? "{}",
			) as Record<string, TracePoint[]>;
			all[busId] = simplified;
			localStorage.setItem("buslink_route_geometry", JSON.stringify(all));
		} catch {}
	}

	useEffect(() => {
		return () => {
			if (stopWatchRef.current !== null) {
				stopWatchRef.current();
				stopWatchRef.current = null;
			}
		};
	}, []);

	return (
		<div
			className="rounded-none border-2 border-foreground p-5 neo-shadow"
			style={{ background: "var(--bg-surface)" }}
		>
			<p
				className="text-xl font-black uppercase tracking-wide"
				style={{
					fontFamily: "'Barlow Condensed', sans-serif",
					color: "var(--text-primary)",
				}}
			>
				Route Trace — Bus {busId}
			</p>
			<p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
				Drive the actual route while tracing. BusLink will record your exact
				path so the bus marker follows the real road.
			</p>

			{error && (
				<p
					className="mt-2 border-2 border-foreground p-2 text-xs font-bold uppercase tracking-wide"
					style={{
						background: "var(--status-stopped-bg)",
						color: "var(--status-stopped-text)",
					}}
				>
					{error}
				</p>
			)}

			<div className="mt-4 flex items-center gap-3">
				{!tracing ? (
					<button
						onClick={startTrace}
						className="theme-btn-teal brutal-transition brutal-hover h-11 rounded-none border-2 px-6 text-sm font-bold uppercase tracking-wide neo-shadow hover:opacity-90"
					>
						Start Route Trace
					</button>
				) : (
					<button
						onClick={stopTrace}
						className="theme-btn-danger brutal-transition brutal-hover h-11 rounded-none border-2 px-6 text-sm font-bold uppercase tracking-wide neo-shadow hover:opacity-90"
					>
						Stop & Save Trace
					</button>
				)}

				{points.length > 0 && (
					<p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
						{tracing ? (
							<span className="flex items-center gap-2">
								<span
									className="inline-block h-2 w-2 animate-pulse rounded-full"
									style={{ background: "var(--status-stopped-text)" }}
								/>
								Recording... {points.length} points captured
							</span>
						) : (
							`✓ ${points.length} points saved`
						)}
					</p>
				)}
			</div>

			{!tracing && points.length > 0 && (
				<p
					className="mt-3 border-2 border-foreground p-2 text-xs font-bold uppercase tracking-wide"
					style={{
						background: "var(--status-running-bg)",
						color: "var(--status-running-text)",
					}}
				>
					Route saved! The bus marker will now follow this exact path. Re-trace
					anytime if the route changes.
				</p>
			)}
		</div>
	);
}
