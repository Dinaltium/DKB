"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Stop } from "@/lib/db/schema";

interface StopBuilderProps {
	stops: Stop[];
	value: string[];
	onChange: (ids: string[]) => void;
}

export function StopBuilder({ stops, value, onChange }: StopBuilderProps) {
	const [search, setSearch] = useState("");
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const selectedStops = value
		.map((id) => stops.find((s) => s.id === id))
		.filter((s): s is Stop => !!s);

	const remainingStops = stops.filter((s) => !value.includes(s.id));
	const filtered = remainingStops.filter((s) =>
		s.name.toLowerCase().includes(search.toLowerCase()),
	);

	const addStop = (id: string) => {
		onChange([...value, id]);
		setSearch("");
		setDropdownOpen(false);
	};

	const removeStop = (id: string) => onChange(value.filter((v) => v !== id));

	const moveUp = (idx: number) => {
		if (idx === 0) return;
		const next = [...value];
		[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
		onChange(next);
	};

	const moveDown = (idx: number) => {
		if (idx === value.length - 1) return;
		const next = [...value];
		[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
		onChange(next);
	};

	return (
		<div className="space-y-1">
			{selectedStops.map((stop, idx) => (
				<div
					key={stop.id}
					className="flex items-center border-2 px-3 py-2"
					style={{
						background: "var(--bg-surface)",
						borderColor: "var(--text-primary)",
						boxShadow: "2px 2px 0 var(--text-primary)",
					}}
				>
					<span
						className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center border-2 text-[10px] font-black"
						style={{
							borderColor: "var(--text-primary)",
							background: "var(--cta-bg)",
							color: "var(--text-primary)",
						}}
					>
						{idx + 1}
					</span>

					<span
						className="flex-1 text-sm font-extrabold uppercase tracking-wide"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							color: "var(--text-primary)",
						}}
					>
						{stop.name}
					</span>

					<span
						className="mr-3 hidden text-[10px] sm:block"
						style={{ color: "var(--text-muted)" }}
					>
						{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
					</span>

					<div className="flex gap-1">
						<button
							type="button"
							onClick={() => moveUp(idx)}
							disabled={idx === 0}
							className="flex h-7 w-7 items-center justify-center rounded-none border-2 text-xs font-bold shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none disabled:opacity-25"
							style={{
								borderColor: "var(--text-primary)",
								color: "var(--text-primary)",
							}}
						>
							↑
						</button>
						<button
							type="button"
							onClick={() => moveDown(idx)}
							disabled={idx === selectedStops.length - 1}
							className="flex h-7 w-7 items-center justify-center rounded-none border-2 text-xs font-bold shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none disabled:opacity-25"
							style={{
								borderColor: "var(--text-primary)",
								color: "var(--text-primary)",
							}}
						>
							↓
						</button>
						<button
							type="button"
							onClick={() => removeStop(stop.id)}
							className="flex h-7 w-7 items-center justify-center rounded-none border-2 text-xs font-bold shadow-[4px_4px_0_hsl(var(--foreground))] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
							style={{
								borderColor: "var(--status-stopped-border)",
								color: "var(--status-stopped-text)",
							}}
						>
							✕
						</button>
					</div>
				</div>
			))}

			<div className="relative">
				<button
					type="button"
					onClick={() => setDropdownOpen((d) => !d)}
					className="w-full rounded-none border-2 border-dashed px-3 py-2.5 text-sm font-black uppercase tracking-widest"
					style={{
						borderColor: "var(--text-primary)",
						fontFamily: "'Barlow Condensed', sans-serif",
						color: "var(--text-primary)",
					}}
				>
					ADD MORE +
				</button>

				{dropdownOpen && remainingStops.length > 0 && (
					<div
						className="absolute left-0 right-0 z-50 rounded-none border-2 border-foreground"
						style={{
							background: "var(--bg-surface)",
							borderColor: "var(--text-primary)",
							boxShadow: "4px 4px 0 var(--text-primary)",
							top: "calc(100% + 2px)",
						}}
					>
						<input
							type="text"
							placeholder="Search stop name..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="h-10 w-full border-b-2 px-3 text-sm outline-none"
							style={{
								borderColor: "var(--text-primary)",
								background: "var(--input-bg)",
								color: "var(--input-text)",
							}}
						/>
						<ScrollArea className="max-h-52">
							<div className="pr-2">
								{filtered.length === 0 ? (
									<p
										className="px-3 py-3 text-xs"
										style={{ color: "var(--text-muted)" }}
									>
										No matching stops
									</p>
								) : (
									filtered.map((stop) => (
										<button
											key={stop.id}
											type="button"
											onClick={() => addStop(stop.id)}
											className="flex w-full items-center justify-between border-b-2 border-foreground px-3 py-2 text-left font-bold uppercase tracking-wide"
											style={{ color: "var(--text-primary)" }}
										>
											<span
												className="font-extrabold uppercase"
												style={{
													fontFamily: "'Barlow Condensed', sans-serif",
													color: "var(--text-primary)",
												}}
											>
												{stop.name}
											</span>
											<span
												className="text-[10px]"
												style={{ color: "var(--text-muted)" }}
											>
												{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
											</span>
										</button>
									))
								)}
							</div>
						</ScrollArea>
					</div>
				)}

				{dropdownOpen && remainingStops.length === 0 && (
					<p
						className="mt-1 text-center text-xs"
						style={{ color: "var(--text-muted)" }}
					>
						All stops have been added
					</p>
				)}
			</div>

			<p className="pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
				{value.length} stop{value.length !== 1 ? "s" : ""} selected
			</p>
		</div>
	);
}
