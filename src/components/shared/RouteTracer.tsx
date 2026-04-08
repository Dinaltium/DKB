// app/components/RouteTracer.tsx
"use client";

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
	const watchIdRef = useRef<number | null>(null);

	function startTrace() {
		if (!navigator.geolocation) {
			setError("Geolocation not supported on this device");
			return;
		}
		setPoints([]);
		setTracing(true);
		setError("");

		// Record GPS position every 5 seconds while driving
		watchIdRef.current = navigator.geolocation.watchPosition(
			(pos) => {
				setPoints((prev) => [
					...prev,
					{
						lat: pos.coords.latitude,
						lng: pos.coords.longitude,
						timestamp: Date.now(),
					},
				]);
			},
			(err) => setError(`GPS error: ${err.message}`),
			{
				enableHighAccuracy: true,
				maximumAge: 0,
				timeout: 10000,
			},
		);
	}

	function stopTrace() {
		if (watchIdRef.current !== null) {
			navigator.geolocation.clearWatch(watchIdRef.current);
			watchIdRef.current = null;
		}
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
			if (watchIdRef.current !== null) {
				navigator.geolocation.clearWatch(watchIdRef.current);
			}
		};
	}, []);

	return (
		<div
			className="rounded-none border-2 border-foreground p-5 shadow-[4px_4px_0_hsl(var(--foreground))]"
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
						className="h-11 rounded-none border-2 border-[#0D1B2A] bg-[#0E7C86] px-6 
              text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:opacity-90"
					>
						Start Route Trace
					</button>
				) : (
					<button
						onClick={stopTrace}
						className="h-11 rounded-none border-2 border-[#0D1B2A] bg-rose-600 px-6 
              text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none hover:opacity-90"
					>
						Stop & Save Trace
					</button>
				)}

				{points.length > 0 && (
					<p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
						{tracing ? (
							<span className="flex items-center gap-2">
								<span
									className="inline-block h-2 w-2 animate-pulse 
                  rounded-full bg-rose-500"
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
