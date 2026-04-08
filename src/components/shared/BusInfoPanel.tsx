"use client";

import {
	AlertTriangle,
	Bus,
	DollarSign,
	Route,
	Star,
	User,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { updateBusDetailsAction } from "@/lib/actions/bus";
import type { BusWithRouteIds } from "@/lib/db/queries";
import type { Complaint, Payment, Stop } from "@/lib/db/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BusPanelTab = "info" | "edit";

export interface BusInfoPanelProps {
	bus: BusWithRouteIds;
	/** All stops (to resolve routeStopIds → names) */
	allStops: Stop[];
	/** Operator name for this bus */
	operatorName?: string | null;
	/** All complaints to filter by bus */
	complaints?: Complaint[];
	/** All payments to filter by bus */
	payments?: Payment[];
	mode: "admin" | "view";
	/** Show a ← back button */
	onBack?: () => void;
	onSaved?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function busRating(bus: BusWithRouteIds): string {
	const { onTime, slightlyLate, veryLate } = bus.votes;
	const n = onTime + slightlyLate + veryLate;
	if (n === 0) return "—";
	return ((onTime * 5 + slightlyLate * 3 + veryLate) / n).toFixed(1);
}

function totalVotes(bus: BusWithRouteIds): number {
	return bus.votes.onTime + bus.votes.slightlyLate + bus.votes.veryLate;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div
			className="border-2 border-foreground px-4 py-3"
			style={{ background: "var(--bg-surface)", marginBottom: "-2px" }}
		>
			<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
				{label}
			</p>
			<div
				className="text-sm font-semibold"
				style={{ color: "var(--text-primary)" }}
			>
				{value}
			</div>
		</div>
	);
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BusInfoPanel({
	bus,
	allStops,
	operatorName,
	complaints = [],
	payments = [],
	mode,
	onBack,
	onSaved,
}: BusInfoPanelProps) {
	const [activeTab, setActiveTab] = useState<BusPanelTab>("info");

	// Edit form state
	const [st, setSt] = useState(bus.status);
	const [note, setNote] = useState(bus.statusNote);
	const [driver, setDriver] = useState(bus.driverName);
	const [conductor, setConductor] = useState(bus.conductorName);
	const [occ, setOcc] = useState(String(bus.occupiedSeats));
	const [women, setWomen] = useState(String(bus.womenReservedAvailable));
	const [savePending, startSave] = useTransition();

	// Resolve route stops
	const stopMap = Object.fromEntries(allStops.map((s) => [s.id, s]));
	const routeStops = (bus.routeStopIds ?? [])
		.map((id) => stopMap[id])
		.filter(Boolean) as Stop[];

	// Bus-specific stats
	const busComplaints = complaints.filter((c) => c.busId === bus.id);
	const pendingComplaints = busComplaints.filter(
		(c) => c.status === "pending",
	).length;
	const busPayments = payments.filter((p) => p.busId === bus.id);
	const finesTotal = busPayments
		.filter((p) => p.status === "failed")
		.reduce((sum, p) => sum + p.amount, 0);
	const totalRevenue = busPayments
		.filter((p) => p.status === "success")
		.reduce((sum, p) => sum + p.amount, 0);

	const rating = busRating(bus);
	const votes = totalVotes(bus);

	const TAB_BASE = [
		"h-9 rounded-none border-2 border-foreground px-5",
		"text-xs font-black uppercase tracking-widest",
		"shadow-[4px_4px_0_hsl(var(--shadow-color))]",
		"transition-all duration-200",
		"hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none",
	].join(" ");

	return (
		<div className="flex flex-col gap-0">
			{/* ── Back button ── */}
			{onBack && (
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide hover:opacity-70 mb-3"
					style={{ color: "var(--text-muted)" }}
				>
					← Back to buses
				</button>
			)}

			{/* ── Tab bar ── */}
			<div className="flex gap-2 mb-4">
				<button
					type="button"
					onClick={() => setActiveTab("info")}
					className={`${TAB_BASE} ${
						activeTab === "info"
							? "translate-x-[4px] translate-y-[4px] shadow-none bg-foreground text-background"
							: "bg-background text-foreground"
					}`}
					style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
				>
					INFO
				</button>
				{mode === "admin" && (
					<button
						type="button"
						onClick={() => setActiveTab("edit")}
						className={`${TAB_BASE} ${
							activeTab === "edit"
								? "translate-x-[4px] translate-y-[4px] shadow-none bg-foreground text-background"
								: "bg-background text-foreground"
						}`}
						style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
					>
						EDIT
					</button>
				)}
			</div>

			{/* ════════════ INFO TAB ════════════ */}
			{activeTab === "info" && (
				<ScrollArea className="max-h-[520px]">
					<div className="pr-2 space-y-0">
						{/* ── Identity header ── */}
						<div
							className="flex items-center gap-4 border-2 border-foreground p-4 mb-4"
							style={{ background: "var(--bg-surface-2)" }}
						>
							<div
								className="flex h-16 w-16 shrink-0 items-center justify-center border-2 border-foreground font-black text-xl text-white shadow-[4px_4px_0_hsl(var(--shadow-color))]"
								style={{
									background: "#0D1B2A",
									fontFamily: "'Barlow Condensed', sans-serif",
								}}
							>
								<Bus className="h-7 w-7 text-[#F4A522]" />
							</div>
							<div>
								<p
									className="text-2xl font-extrabold uppercase"
									style={{
										fontFamily: "'Barlow Condensed', sans-serif",
										color: "var(--text-primary)",
									}}
								>
									{bus.number}
								</p>
								<p
									className="text-sm"
									style={{ color: "var(--text-secondary)" }}
								>
									{bus.origin} → {bus.destination}
								</p>
								<div className="mt-1">
									<StatusBadge status={bus.status} />
								</div>
							</div>
						</div>

						{/* ── Stats grid ── */}
						<div className="grid grid-cols-3 mb-4">
							{(
								[
									[
										"Rating",
										rating + (votes > 0 ? ` (${votes})` : ""),
										<Star key="rating" className="h-3 w-3 text-[#F4A522]" />,
									],
									[
										"Complaints",
										String(busComplaints.length),
										<AlertTriangle
											key="complaints"
											className="h-3 w-3 text-red-500"
										/>,
									],
									[
										"Fines",
										`₹${finesTotal}`,
										<DollarSign key="fines" className="h-3 w-3 text-red-400" />,
									],
									[
										"Revenue",
										`₹${totalRevenue}`,
										<DollarSign
											key="revenue"
											className="h-3 w-3 text-[#0E7C86]"
										/>,
									],
									[
										"Pending",
										String(pendingComplaints),
										<AlertTriangle
											key="pending"
											className="h-3 w-3 text-amber-500"
										/>,
									],
									[
										"Seats",
										`${bus.totalSeats - bus.occupiedSeats}/${bus.totalSeats}`,
										<User key="seats" className="h-3 w-3 text-[#0E7C86]" />,
									],
								] as [string, string, React.ReactNode][]
							).map(([label, value, icon], i) => (
								<div
									key={label}
									className="border-2 border-foreground p-3 text-center"
									style={{
										marginRight: i % 3 !== 2 ? "-2px" : 0,
										marginBottom: i < 3 ? "-2px" : 0,
										background: "var(--bg-surface)",
									}}
								>
									<div className="flex items-center justify-center gap-1 mb-0.5">
										{icon}
										<p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
											{label}
										</p>
									</div>
									<p
										className="text-xl font-black"
										style={{
											fontFamily: "'Barlow Condensed', sans-serif",
											color: "var(--text-primary)",
										}}
									>
										{value}
									</p>
								</div>
							))}
						</div>

						{/* ── Core details ── */}
						<div>
							<InfoRow label="License Plate" value={bus.licensePlate} />
							<InfoRow
								label="Full Fare"
								value={
									<span className="text-[#0E7C86] font-bold">
										₹{bus.fullFare}
									</span>
								}
							/>
							<InfoRow label="Driver" value={bus.driverName} />
							<InfoRow label="Conductor" value={bus.conductorName} />
							{operatorName && (
								<InfoRow label="Operator" value={operatorName} />
							)}
							<InfoRow
								label="Women Reserved"
								value={`${bus.womenReservedAvailable} available / ${bus.womenReservedTotal} total`}
							/>
							<InfoRow
								label="Student Discount"
								value={
									bus.studentCardAccepted ? (
										<span className="text-[#0E7C86]">
											Accepted · {bus.studentDiscountPercent}% off
										</span>
									) : (
										<span className="text-muted-foreground">Not accepted</span>
									)
								}
							/>
							<InfoRow
								label="Status Note"
								value={
									<span className="text-sm font-normal normal-case">
										{bus.statusNote || "—"}
									</span>
								}
							/>
							<div className="border-b-2 border-foreground" />
						</div>

						{/* ── Schedule ── */}
						<div
							className="border-2 border-foreground px-4 py-3 mt-4"
							style={{ background: "var(--bg-surface)" }}
						>
							<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
								Schedule
							</p>
							<div className="flex flex-wrap gap-1.5">
								{bus.schedule.length === 0 ? (
									<span className="text-xs text-muted-foreground">
										No schedule set
									</span>
								) : (
									bus.schedule.map((t) => (
										<span
											key={t}
											className="border-2 border-foreground px-2 py-0.5 text-xs font-bold"
											style={{
												background: "var(--bg-surface-2)",
												color: "var(--text-primary)",
											}}
										>
											{t}
										</span>
									))
								)}
							</div>
						</div>

						{/* ── Crowd votes breakdown ── */}
						<div
							className="border-2 border-foreground px-4 py-3 mt-0"
							style={{ background: "var(--bg-surface)", marginTop: "-2px" }}
						>
							<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
								Crowd Votes
							</p>
							<div className="grid grid-cols-3 gap-2">
								{[
									["On Time", bus.votes.onTime, "#0E7C86"],
									["Slightly Late", bus.votes.slightlyLate, "#F4A522"],
									["Very Late", bus.votes.veryLate, "#ef4444"],
								].map(([label, count, color]) => (
									<div key={String(label)} className="text-center">
										<p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
											{label}
										</p>
										<p
											className="text-xl font-black"
											style={{
												fontFamily: "'Barlow Condensed', sans-serif",
												color: color as string,
											}}
										>
											{count as number}
										</p>
									</div>
								))}
							</div>
						</div>

						{/* ── Route stops ── */}
						<div
							className="border-2 border-foreground px-4 py-3 mt-0"
							style={{ background: "var(--bg-surface)", marginTop: "-2px" }}
						>
							<div className="flex items-center gap-1.5 mb-3">
								<Route className="h-3.5 w-3.5" style={{ color: "#0E7C86" }} />
								<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
									Locations Covered ({routeStops.length} stops)
								</p>
							</div>
							{routeStops.length === 0 ? (
								<p className="text-xs text-muted-foreground">
									No stops assigned
								</p>
							) : (
								<div className="relative">
									{/* Vertical line */}
									<div
										className="absolute left-[7px] top-2 bottom-2 w-0.5"
										style={{ background: "var(--border-medium)" }}
									/>
									<div className="space-y-2">
										{routeStops.map((stop, idx) => {
											const isFirst = idx === 0;
											const isLast = idx === routeStops.length - 1;
											return (
												<div
													key={stop.id}
													className="flex items-center gap-3 pl-1"
												>
													<div
														className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-foreground"
														style={{
															background:
																isFirst || isLast ? "#0D1B2A" : "#0E7C86",
														}}
													>
														{(isFirst || isLast) && (
															<div className="h-1.5 w-1.5 rounded-full bg-[#F4A522]" />
														)}
													</div>
													<div className="flex flex-1 items-center justify-between">
														<span
															className="text-xs font-bold uppercase tracking-wide"
															style={{
																color:
																	isFirst || isLast
																		? "var(--text-primary)"
																		: "var(--text-secondary)",
																fontFamily: "'Barlow Condensed', sans-serif",
															}}
														>
															{stop.name}
														</span>
														<span className="font-mono text-[9px] text-muted-foreground">
															{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
														</span>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							)}
						</div>
					</div>
				</ScrollArea>
			)}

			{/* ════════════ EDIT TAB ════════════ */}
			{activeTab === "edit" && mode === "admin" && (
				<ScrollArea className="max-h-[520px]">
					<div className="pr-2 space-y-3">
						{/* Status */}
						<div>
							<Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
								Status
							</Label>
							<select
								value={st}
								onChange={(e) => setSt(e.target.value as typeof bus.status)}
								className="mt-1 h-10 w-full rounded-none border-2 border-foreground bg-background px-2 text-sm shadow-[4px_4px_0_hsl(var(--foreground))]"
								style={{
									background: "var(--input-bg)",
									color: "var(--input-text)",
								}}
							>
								<option>Running</option>
								<option>Not Running</option>
								<option>Delayed</option>
							</select>
						</div>

						<div>
							<Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
								Status Note
							</Label>
							<Input
								value={note}
								onChange={(e) => setNote(e.target.value)}
								className="mt-1 rounded-none border-2 border-foreground"
							/>
						</div>

						<div>
							<Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
								Driver Name
							</Label>
							<Input
								value={driver}
								onChange={(e) => setDriver(e.target.value)}
								className="mt-1 rounded-none border-2 border-foreground"
							/>
						</div>

						<div>
							<Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
								Conductor Name
							</Label>
							<Input
								value={conductor}
								onChange={(e) => setConductor(e.target.value)}
								className="mt-1 rounded-none border-2 border-foreground"
							/>
						</div>

						<div>
							<Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
								Occupied Seats
							</Label>
							<Input
								type="number"
								value={occ}
								onChange={(e) => setOcc(e.target.value)}
								className="mt-1 rounded-none border-2 border-foreground"
							/>
						</div>

						<div>
							<Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
								Women Reserved Available
							</Label>
							<Input
								type="number"
								value={women}
								onChange={(e) => setWomen(e.target.value)}
								className="mt-1 rounded-none border-2 border-foreground"
							/>
						</div>

						<Button
							type="button"
							disabled={savePending}
							onClick={() =>
								startSave(async () => {
									const r = await updateBusDetailsAction(bus.id, {
										status: st,
										statusNote: note,
										driverName: driver,
										conductorName: conductor,
										occupiedSeats: Number(occ),
										womenReservedAvailable: Number(women),
									});
									if (r.success) {
										toast.success("Bus updated");
										onSaved?.();
									} else {
										toast.error(r.error ?? "Failed");
									}
								})
							}
							className="w-full rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
						>
							{savePending ? "Saving…" : "Save Changes"}
						</Button>
					</div>
				</ScrollArea>
			)}
		</div>
	);
}
export default BusInfoPanel;
