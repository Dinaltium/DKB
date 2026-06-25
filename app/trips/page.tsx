"use client";

// Bus trip search.
//
// Renders inside AppShell so the BottomNav is present and the page picks up
// BoldKit colour tokens. The form takes free-text origin/destination plus
// an optional Use-my-location button that routes through lib/native so it
// works in both the web app and the Capacitor shell.

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentPosition } from "@/lib/native";
import {
	ArrowRight,
	Loader2,
	MapPin,
	Navigation,
	Search,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface TripRow {
	id: number;
	bus_name?: string;
	busId?: string;
	registration_number?: string;
	route_name?: string;
	start_city?: string;
	end_city?: string;
	departureDate?: string;
	departureTime24?: string;
	is_live?: boolean;
	total_seats?: number;
	available_seats?: number;
	fare_inr?: number;
}

export default function TripSearchPage() {
	const [trips, setTrips] = useState<TripRow[]>([]);
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [lat, setLat] = useState("");
	const [lng, setLng] = useState("");
	const [loading, setLoading] = useState(false);
	const [locating, setLocating] = useState(false);
	const [error, setError] = useState("");
	const [searched, setSearched] = useState(false);

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		setSearched(true);
		try {
			let url = `/api/trips/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
			if (lat && lng) url += `&lat=${lat}&lng=${lng}`;
			const response = await fetch(url);
			const resJson = await response.json();
			if (resJson.success) {
				setTrips(resJson.data || []);
			} else {
				setError(resJson.error || "Failed to search trips");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Network error");
		} finally {
			setLoading(false);
		}
	};

	const useMyLocation = async () => {
		setLocating(true);
		setError("");
		try {
			const pos = await getCurrentPosition();
			if (pos) {
				setLat(pos.lat.toString());
				setLng(pos.lng.toString());
			} else {
				setError("Could not get your location");
			}
		} finally {
			setLocating(false);
		}
	};

	return (
		<AppShell title="Find a Trip" subtitle="Search corridor buses by stop">
			{/* ── Search form ── */}
			<section
				className="theme-panel rounded-none border-2 p-4 neo-shadow md:p-6"
				style={{ borderColor: "var(--border-default)" }}
			>
				<form onSubmit={handleSearch} className="space-y-4">
					<Field
						label="From"
						icon={<MapPin className="h-4 w-4" />}
						value={from}
						onChange={setFrom}
						placeholder="e.g. Mangalore"
						required
					/>
					<Field
						label="To"
						icon={<MapPin className="h-4 w-4" />}
						value={to}
						onChange={setTo}
						placeholder="e.g. Udupi"
						required
					/>

					{/* Use-my-location */}
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={useMyLocation}
							disabled={locating}
							className="theme-btn-secondary brutal-transition brutal-hover inline-flex h-11 items-center gap-2 rounded-none border-2 px-4 text-xs font-black uppercase tracking-widest neo-shadow disabled:opacity-50"
						>
							{locating ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Navigation className="h-4 w-4" />
							)}
							Use my location
						</button>
						{lat && lng && (
							<span className="theme-pill-accent rounded-none border-2 px-2 py-1 font-mono text-[11px] font-bold">
								{Number(lat).toFixed(3)}, {Number(lng).toFixed(3)}
							</span>
						)}
					</div>

					{/* Submit — full-width on mobile */}
					<button
						type="submit"
						disabled={loading}
						className="theme-btn-primary brutal-transition brutal-hover inline-flex h-12 w-full items-center justify-center gap-2 rounded-none border-2 px-5 text-sm font-black uppercase tracking-wide neo-shadow disabled:opacity-50 sm:w-auto"
					>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" /> Searching…
							</>
						) : (
							<>
								<Search className="h-4 w-4" /> Search trips
							</>
						)}
					</button>
				</form>

				{error && (
					<div
						className="mt-4 rounded-none border-2 p-3 text-xs font-bold uppercase tracking-wide"
						style={{
							background: "var(--status-stopped-bg)",
							color: "var(--status-stopped-text)",
							borderColor: "var(--border-default)",
						}}
					>
						{error}
					</div>
				)}
			</section>

			{/* ── Results ── */}
			<section className="mt-8">
				<div className="mb-4 flex items-baseline gap-3">
					<span
						className="theme-bg-amber inline-block h-6 w-2 border-2 border-foreground"
						aria-hidden
					/>
					<h2
						className="text-xl font-black uppercase tracking-wide"
						style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
					>
						Results
					</h2>
					{searched && !loading && (
						<span
							className="text-xs font-bold uppercase tracking-widest"
							style={{ color: "var(--text-muted)" }}
						>
							{trips.length} {trips.length === 1 ? "trip" : "trips"}
						</span>
					)}
				</div>

				{!searched && (
					<p
						className="rounded-none border-2 border-dashed p-6 text-center text-sm"
						style={{
							borderColor: "var(--border-default)",
							color: "var(--text-muted)",
						}}
					>
						Enter stops above to search.
					</p>
				)}

				{searched && loading && (
					<div className="space-y-3">
						{[0, 1, 2].map((i) => (
							<div
								key={i}
								className="theme-panel h-28 animate-pulse rounded-none border-2"
								style={{ borderColor: "var(--border-default)" }}
							/>
						))}
					</div>
				)}

				{searched && !loading && trips.length === 0 && (
					<p
						className="rounded-none border-2 border-dashed p-6 text-center text-sm"
						style={{
							borderColor: "var(--border-default)",
							color: "var(--text-muted)",
						}}
					>
						No trips match those stops yet. Try different stop names or pick
						from the map.
					</p>
				)}

				{searched && !loading && trips.length > 0 && (
					<ul className="space-y-3">
						{trips.map((t) => (
							<li key={t.id}>
								<Link
									href={`/trips/${t.id}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
									className="theme-panel brutal-transition brutal-hover block rounded-none border-2 p-4 neo-shadow"
									style={{ borderColor: "var(--border-default)" }}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p
												className="text-lg font-black uppercase tracking-wide"
												style={{
													fontFamily: "'Barlow Condensed', sans-serif",
													color: "var(--text-primary)",
												}}
											>
												{t.bus_name || t.busId || "Bus"}
											</p>
											{t.registration_number && (
												<p
													className="font-mono text-[11px] font-bold uppercase tracking-widest"
													style={{ color: "var(--text-muted)" }}
												>
													{t.registration_number}
												</p>
											)}
										</div>
										<span
											className={`shrink-0 rounded-none border-2 border-foreground px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
												t.is_live
													? "bg-red-500 text-white"
													: "theme-surface-alt"
											}`}
											style={
												t.is_live ? undefined : { color: "var(--text-muted)" }
											}
										>
											{t.is_live ? "● Live" : "Scheduled"}
										</span>
									</div>

									<p
										className="mt-2 text-sm font-bold"
										style={{ color: "var(--text-primary)" }}
									>
										{t.route_name ||
											(t.start_city && t.end_city
												? `${t.start_city} → ${t.end_city}`
												: "—")}
									</p>

									<div
										className="mt-3 grid grid-cols-2 gap-2 text-xs"
										style={{ color: "var(--text-secondary)" }}
									>
										{(t.departureDate || t.departureTime24) && (
											<span>
												<span
													className="block text-[10px] font-black uppercase tracking-widest"
													style={{ color: "var(--text-muted)" }}
												>
													Departure
												</span>
												{t.departureDate} · {t.departureTime24}
											</span>
										)}
										{typeof t.available_seats === "number" && (
											<span>
												<span
													className="block text-[10px] font-black uppercase tracking-widest"
													style={{ color: "var(--text-muted)" }}
												>
													Seats
												</span>
												<Users className="-mt-0.5 mr-1 inline h-3 w-3" />
												{t.available_seats}/{t.total_seats}
											</span>
										)}
									</div>

									<div className="mt-3 flex items-center justify-between">
										{t.fare_inr != null && (
											<span
												className="theme-text-teal font-mono text-base font-black"
												style={{
													fontFamily: "'Barlow Condensed', sans-serif",
												}}
											>
												₹{t.fare_inr}
											</span>
										)}
										<span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest">
											Book <ArrowRight className="h-3 w-3" />
										</span>
									</div>
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>
		</AppShell>
	);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({
	label,
	icon,
	value,
	onChange,
	placeholder,
	required,
}: {
	label: string;
	icon: React.ReactNode;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	required?: boolean;
}) {
	return (
		<label className="block">
			<span className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest">
				{icon}
				{label}
			</span>
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				required={required}
				className="theme-input h-12 w-full rounded-none border-2 px-3 text-base font-bold"
			/>
		</label>
	);
}
