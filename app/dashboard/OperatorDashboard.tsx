"use client";

import { BusRequestModal } from "@/components/modals/BusRequestModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getOwnerAnalyticsAction } from "@/lib/actions/analytics";
import {
	resolveComplaintAction,
	submitBusRequestAction,
	updateBusStatusAction,
} from "@/lib/actions/bus";
import {
	grantConductorAccessAction,
	getAllConductorsAction,
	getOperatorConductorAssignmentsAction,
	revokeConductorAccessAction,
	searchConductorsAction,
} from "@/lib/actions/conductor";
import {
	applySubscriptionAction,
	getMySubscriptionAction,
} from "@/lib/actions/subscriptions";
import type {
	BusRequest,
	Bus as BusType,
	Complaint,
	Operator,
	Payment,
	Stop,
} from "@/lib/db/schema";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface Props {
	operator: Operator;
	buses: BusType[];
	complaints: Complaint[];
	payments: Payment[];
	busRequests: BusRequest[];
	stops: Stop[];
}

export function OperatorDashboard({
	operator,
	buses,
	complaints,
	payments,
	busRequests,
	stops,
}: Props) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [activeTab, setActiveTab] = useState<
		"buses" | "conductors" | "subscriptions" | "analytics" | "complaints"
	>("buses");

	// Analytics state
	const [analytics, setAnalytics] = useState<any>(null);
	const [analyticsLoading, setAnalyticsLoading] = useState(false);

	// Subscription state
	const [subscription, setSubscription] = useState<any>(null);
	const [numBuses, setNumBuses] = useState(1);
	const [amountPaid, setAmountPaid] = useState("");
	const [upiTxnId, setUpiTxnId] = useState("");

	// Conductor management state
	const [searchQuery, setSearchQuery] = useState("");
	const [allConductors, setAllConductors] = useState<any[]>([]);
	const [foundConductors, setFoundConductors] = useState<any[]>([]);
	const [selectedConductorId, setSelectedConductorId] = useState("");
	const [selectedBusId, setSelectedBusId] = useState("");
	const [assignments, setAssignments] = useState<any[]>([]);
	const [conductorsLoading, setConductorsLoading] = useState(false);
	const [assignmentsLoading, setAssignmentsLoading] = useState(false);

	useEffect(() => {
		if (activeTab === "analytics") {
			loadAnalytics();
		} else if (activeTab === "subscriptions") {
			loadSubscription();
		} else if (activeTab === "conductors") {
			loadConductors();
			loadAssignments();
		}
	}, [activeTab]);

	const loadAnalytics = async () => {
		setAnalyticsLoading(true);
		try {
			const res = await getOwnerAnalyticsAction();
			if (res.success && res.data) {
				setAnalytics(res.data);
			}
		} catch (err: any) {
			toast.error(`Failed to load analytics: ${err.message}`);
		} finally {
			setAnalyticsLoading(false);
		}
	};

	const loadSubscription = async () => {
		try {
			const res = await getMySubscriptionAction();
			if (res.success && res.data) {
				setSubscription(res.data);
			}
		} catch (err: any) {
			toast.error(`Failed to load subscription: ${err.message}`);
		}
	};

	const loadConductors = async () => {
		setConductorsLoading(true);
		try {
			const res = await getAllConductorsAction();
			if (res.success && res.data) {
				setAllConductors(res.data);
				setFoundConductors(res.data);
			}
		} catch (err: any) {
			toast.error(`Failed to load conductors: ${err.message}`);
		} finally {
			setConductorsLoading(false);
		}
	};

	const loadAssignments = async () => {
		setAssignmentsLoading(true);
		try {
			const res = await getOperatorConductorAssignmentsAction();
			if (res.success && res.data) {
				setAssignments(res.data);
			}
		} catch (err: any) {
			toast.error(`Failed to load assignments: ${err.message}`);
		} finally {
			setAssignmentsLoading(false);
		}
	};

	const handleConductorSearch = (query: string) => {
		setSearchQuery(query);
		if (!query.trim()) {
			setFoundConductors(allConductors);
			return;
		}
		const q = query.toLowerCase();
		setFoundConductors(
			allConductors.filter(
				(c) =>
					c.name?.toLowerCase().includes(q) ||
					c.email?.toLowerCase().includes(q) ||
					c.phone?.toLowerCase().includes(q),
			),
		);
	};

	const handleGrantAccess = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedConductorId || !selectedBusId) {
			toast.error("Conductor and Bus are required");
			return;
		}
		startTransition(async () => {
			const res = await grantConductorAccessAction({
				conductorId: selectedConductorId,
				busId: selectedBusId,
			});
			if (res.success) {
				toast.success(
					`Access granted! Conductor Code: ${res.data?.conductorCode}`,
				);
				setSelectedConductorId("");
				setSelectedBusId("");
				// Reload assignments to show the new one
				loadAssignments();
			} else {
				toast.error(res.error || "Failed to grant access");
			}
		});
	};

	const handleRevokeAccess = async (conductorId: string, busId: string) => {
		if (!confirm("Revoke this conductor's access to the bus?")) return;
		startTransition(async () => {
			const res = await revokeConductorAccessAction({ conductorId, busId });
			if (res.success) {
				toast.success("Access revoked successfully!");
				loadAssignments();
			} else {
				toast.error(res.error || "Failed to revoke access");
			}
		});
	};

	const handleApplySubscription = async (e: React.FormEvent) => {
		e.preventDefault();
		startTransition(async () => {
			const res = await applySubscriptionAction({
				numBuses,
				amountPaidInr: Number(amountPaid),
				upiTxnId,
			});
			if (res.success) {
				toast.success("Subscription application submitted!");
				setAmountPaid("");
				setUpiTxnId("");
				loadSubscription();
			} else {
				toast.error(res.error || "Failed to submit subscription");
			}
		});
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div
				className="rounded-none border-2 p-4 neo-shadow"
				style={{
					borderColor: "var(--text-primary)",
					background: "var(--bg-surface)",
				}}
			>
				<p
					className="text-2xl font-extrabold uppercase"
					style={{
						fontFamily: "'Barlow Condensed', sans-serif",
						color: "var(--text-primary)",
					}}
				>
					{operator.companyName}
				</p>
				<p className="text-xs" style={{ color: "var(--text-muted)" }}>
					Buses: {buses.length} • Payments: {payments.length} • Complaints:{" "}
					{complaints.length}
				</p>
			</div>

			{/* Tabs */}
			<div
				className="flex gap-2 border-b-2"
				style={{ borderColor: "var(--border-default)" }}
			>
				{(
					[
						"buses",
						"conductors",
						"subscriptions",
						"analytics",
						"complaints",
					] as const
				).map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						className={`px-4 py-2 text-sm font-bold uppercase ${activeTab === tab ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
					>
						{tab}
					</button>
				))}
			</div>

			{/* ── Tab Content ── */}

			{/* 1. Buses */}
			{activeTab === "buses" && (
				<div className="space-y-4">
					<button
						type="button"
						onClick={() => setOpen(true)}
						className="h-10 rounded-none border-2 px-4 text-xs font-bold uppercase neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none"
						style={{
							background: "var(--cta-bg)",
							borderColor: "var(--text-primary)",
							color: "var(--text-primary)",
						}}
					>
						+ REQUEST BUS REGISTRATION
					</button>

					{buses.map((bus) => (
						<article
							key={bus.id}
							className="rounded-none border-2 p-3 neo-shadow"
							style={{
								borderColor: "var(--text-primary)",
								background: "var(--bg-surface)",
							}}
						>
							<div className="flex items-center justify-between gap-3">
								<div>
									<p
										className="text-xl font-extrabold uppercase"
										style={{
											fontFamily: "'Barlow Condensed', sans-serif",
											color: "var(--text-primary)",
										}}
									>
										{bus.number}
									</p>
									<p className="text-xs" style={{ color: "var(--text-muted)" }}>
										{bus.origin} → {bus.destination}
									</p>
									<StatusBadge status={bus.status} />
								</div>
								<div className="flex gap-2">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button
												className="flex h-9 items-center justify-between gap-2 border-2 px-3 text-xs"
												style={{
													background: "var(--input-bg)",
													borderColor: "var(--input-border)",
													color: "var(--input-text)",
												}}
											>
												{bus.status}
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											{["Running", "Not Running", "Delayed"].map((status) => (
												<DropdownMenuItem
													key={status}
													onClick={() =>
														startTransition(async () => {
															const r = await updateBusStatusAction(
																bus.id,
																status as BusType["status"],
															);
															r.success
																? toast.success("Status updated")
																: toast.error(r.error ?? "Failed");
														})
													}
													className="cursor-pointer font-bold uppercase tracking-wide text-xs"
												>
													{status}
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
									<Link
										href={`/bus/${bus.id}`}
										className="inline-flex h-9 items-center rounded-none border-2 px-3 text-xs font-bold uppercase neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none"
										style={{
											borderColor: "var(--text-primary)",
											color: "var(--text-primary)",
										}}
									>
										VIEW
									</Link>
								</div>
							</div>
						</article>
					))}

					{busRequests
						.filter((req) => req.status !== "approved")
						.map((req) => (
							<article
								key={req.id}
								className="border-2 p-3"
								style={{
									borderColor: "var(--text-primary)",
									background: "var(--bg-surface)",
								}}
							>
								<p
									className="font-bold"
									style={{ color: "var(--text-primary)" }}
								>
									{req.number}
								</p>
								<StatusBadge status={req.status} />
							</article>
						))}
				</div>
			)}

			{/* 2. Conductors Access Management */}
			{activeTab === "conductors" && (
				<div className="grid gap-6 md:grid-cols-2">
					{/* Left: Assign form */}
					<div
						className="border-2 p-4 space-y-4"
						style={{ background: "var(--bg-surface)" }}
					>
						<h3 className="text-lg font-bold uppercase tracking-wide">
							Assign Conductor to Bus
						</h3>

						{/* Search/filter bar */}
						<div>
							<label className="block text-xs font-bold uppercase mb-1">
								Filter Conductors
							</label>
							<input
								type="text"
								placeholder="Type name, email, or phone to filter..."
								value={searchQuery}
								onChange={(e) => handleConductorSearch(e.target.value)}
								className="w-full border-2 p-2 font-mono text-sm"
								style={{
									background: "var(--input-bg)",
									color: "var(--input-text)",
									borderColor: "var(--input-border)",
								}}
							/>
						</div>

						<form onSubmit={handleGrantAccess} className="space-y-4">
							{/* Conductor picker */}
							<div>
								<label className="block text-xs font-bold uppercase mb-1">
									Select Conductor
									{conductorsLoading && (
										<span className="ml-2 text-muted-foreground font-normal">Loading...</span>
									)}
								</label>
								{foundConductors.length === 0 && !conductorsLoading ? (
									<p className="text-xs text-muted-foreground border-2 p-3">
										No conductors found. Make sure users with the
										<strong> Conductor</strong> role exist in the system.
									</p>
								) : (
									<select
										value={selectedConductorId}
										onChange={(e) => setSelectedConductorId(e.target.value)}
										required
										className="w-full border-2 p-2 font-mono text-sm"
										style={{
											background: "var(--input-bg)",
											color: "var(--input-text)",
											borderColor: "var(--input-border)",
										}}
									>
										<option value="">
											— Select Conductor ({foundConductors.length} available) —
										</option>
										{foundConductors.map((c) => (
											<option key={c.id} value={c.id}>
												{c.name ?? "(No name)"} — {c.email}
												{c.phone ? ` • ${c.phone}` : ""}
											</option>
										))}
									</select>
								)}
							</div>

							{/* Bus picker */}
							<div>
								<label className="block text-xs font-bold uppercase mb-1">
									Assign to Bus
								</label>
								{buses.length === 0 ? (
									<p className="text-xs text-muted-foreground border-2 p-3">
										No approved buses found. Get a bus approved by admin first.
									</p>
								) : (
									<select
										value={selectedBusId}
										onChange={(e) => setSelectedBusId(e.target.value)}
										required
										className="w-full border-2 p-2 font-mono text-sm"
										style={{
											background: "var(--input-bg)",
											color: "var(--input-text)",
											borderColor: "var(--input-border)",
										}}
									>
										<option value="">— Select Bus —</option>
										{buses.map((b) => (
											<option key={b.id} value={b.id}>
												{b.number} • {b.origin} → {b.destination}
											</option>
										))}
									</select>
								)}
							</div>

							<button
								type="submit"
								disabled={isPending || !selectedConductorId || !selectedBusId}
								className="w-full border-2 p-2 font-bold uppercase text-sm neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-none"
								style={{
									background: "var(--cta-bg)",
									color: "var(--text-primary)",
									borderColor: "var(--text-primary)",
								}}
							>
								{isPending ? "GRANTING ACCESS..." : "GRANT CONDUCTOR ACCESS"}
							</button>
						</form>
					</div>

					{/* Right: Active assignments */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-bold uppercase">
								Active Assignments
							</h3>
							<button
								type="button"
								onClick={loadAssignments}
								className="text-xs border-2 px-2 py-1 font-bold uppercase"
								style={{ borderColor: "var(--border-default)" }}
							>
								Refresh
							</button>
						</div>

						{assignmentsLoading ? (
							<p className="text-xs text-muted-foreground">Loading assignments...</p>
						) : assignments.length === 0 ? (
							<div
								className="border-2 p-4 text-center"
								style={{ borderStyle: "dashed" }}
							>
								<p className="text-sm font-bold uppercase" style={{ color: "var(--text-muted)" }}>
									No active assignments
								</p>
								<p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
									Use the form on the left to assign conductors to your buses.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{assignments.map((a) => (
									<article
										key={a.accessId}
										className="border-2 p-3 space-y-2"
										style={{
											background: "var(--bg-surface)",
											borderColor: "var(--text-primary)",
										}}
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<p
													className="font-bold text-sm uppercase"
													style={{ color: "var(--text-primary)" }}
												>
													{a.conductor.name ?? "(No name)"}
												</p>
												<p className="text-xs" style={{ color: "var(--text-muted)" }}>
													{a.conductor.email}
													{a.conductor.phone ? ` • ${a.conductor.phone}` : ""}
												</p>
											</div>
											<button
												type="button"
												onClick={() =>
													handleRevokeAccess(a.conductor.id, a.bus.id)
												}
												disabled={isPending}
												className="shrink-0 border-2 px-2 py-1 text-xs font-bold uppercase"
												style={{
													background: "hsl(var(--destructive))",
													color: "hsl(var(--destructive-foreground))",
													borderColor: "var(--text-primary)",
												}}
											>
												Revoke
											</button>
										</div>
										<div
											className="text-xs px-2 py-1 font-mono font-bold"
											style={{
												background: "var(--bg-surface-2)",
												color: "var(--color-teal)",
											}}
										>
											Bus {a.bus.number} • {a.bus.origin} → {a.bus.destination}
										</div>
										<div className="flex items-center justify-between">
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												Code:{" "}
												<span className="font-mono font-bold" style={{ color: "var(--color-amber)" }}>
													{a.conductorCode}
												</span>
											</p>
											<p className="text-xs" style={{ color: "var(--text-muted)" }}>
												{new Date(a.grantedAt).toLocaleDateString("en-IN")}
											</p>
										</div>
									</article>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* 3. Subscription Management */}
			{activeTab === "subscriptions" && (
				<div className="grid gap-6 md:grid-cols-2">
					<div
						className="border-2 p-4"
						style={{ background: "var(--bg-surface)" }}
					>
						<h3 className="mb-4 text-lg font-bold uppercase">
							Purchase/Renew Subscription
						</h3>
						<form onSubmit={handleApplySubscription} className="space-y-4">
							<div>
								<label className="block text-xs font-bold uppercase mb-1">
									Number of Buses to Subscribe
								</label>
								<input
									type="number"
									min="1"
									value={numBuses}
									onChange={(e) => setNumBuses(Number(e.target.value))}
									required
									className="w-full border-2 p-2 font-mono text-sm"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold uppercase mb-1">
									Amount to Pay (₹{numBuses * 500})
								</label>
								<input
									type="number"
									value={amountPaid}
									onChange={(e) => setAmountPaid(e.target.value)}
									required
									placeholder="Enter payment amount"
									className="w-full border-2 p-2 font-mono text-sm"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold uppercase mb-1">
									UPI Txn Ref / Reference ID
								</label>
								<input
									type="text"
									value={upiTxnId}
									onChange={(e) => setUpiTxnId(e.target.value)}
									required
									placeholder="Reference ID"
									className="w-full border-2 p-2 font-mono text-sm"
								/>
							</div>

							<button
								type="submit"
								disabled={isPending}
								className="w-full border-2 p-2 font-bold uppercase text-sm"
								style={{
									background: "var(--cta-bg)",
									color: "var(--text-primary)",
								}}
							>
								{isPending ? "SUBMITTING..." : "SUBMIT SUBSCRIPTION"}
							</button>
						</form>
					</div>

					<div className="space-y-4">
						<h3 className="text-lg font-bold uppercase">
							Current Subscription Status
						</h3>
						{subscription ? (
							<article className="border-2 p-4 space-y-2">
								<p>
									<strong>Status:</strong>{" "}
									<span className="font-bold text-blue-600">
										{subscription.status}
									</span>
								</p>
								<p>
									<strong>Buses Registered:</strong> {subscription.numBuses}
								</p>
								{subscription.startsAt && (
									<p>
										<strong>Starts:</strong>{" "}
										{new Date(subscription.startsAt).toLocaleDateString()}
									</p>
								)}
								{subscription.expiresAt && (
									<p>
										<strong>Expires:</strong>{" "}
										{new Date(subscription.expiresAt).toLocaleDateString()}
									</p>
								)}
								{subscription.rejectionReason && (
									<p className="text-red-500">
										<strong>Rejection Reason:</strong>{" "}
										{subscription.rejectionReason}
									</p>
								)}
							</article>
						) : (
							<p className="text-xs text-muted-foreground">
								No active subscription details found. Register your buses to
								start operations.
							</p>
						)}
					</div>
				</div>
			)}

			{/* 4. Owner Analytics */}
			{activeTab === "analytics" && (
				<div>
					{analyticsLoading ? (
						<p>Loading analytics reports...</p>
					) : analytics ? (
						<div className="space-y-6">
							<section className="grid gap-4 md:grid-cols-4">
								<div
									className="border-2 p-4"
									style={{ background: "var(--bg-surface)" }}
								>
									<p className="text-xs font-bold uppercase">Revenue (Today)</p>
									<p className="text-2xl font-bold">
										₹{analytics.revenue.today_inr}
									</p>
								</div>
								<div
									className="border-2 p-4"
									style={{ background: "var(--bg-surface)" }}
								>
									<p className="text-xs font-bold uppercase">
										Revenue (Weekly)
									</p>
									<p className="text-2xl font-bold">
										₹{analytics.revenue.week_inr}
									</p>
								</div>
								<div
									className="border-2 p-4"
									style={{ background: "var(--bg-surface)" }}
								>
									<p className="text-xs font-bold uppercase">
										Revenue (Monthly)
									</p>
									<p className="text-2xl font-bold">
										₹{analytics.revenue.month_inr}
									</p>
								</div>
								<div
									className="border-2 p-4"
									style={{ background: "var(--bg-surface)" }}
								>
									<p className="text-xs font-bold uppercase">Total Revenue</p>
									<p className="text-2xl font-bold">
										₹{analytics.revenue.total_inr}
									</p>
								</div>
							</section>

							{/* Routes stats table */}
							<div
								className="border-2 p-4"
								style={{ background: "var(--bg-surface)" }}
							>
								<h3 className="mb-4 text-lg font-bold uppercase">
									Routes Breakdown
								</h3>
								<table style={{ width: "100%", borderCollapse: "collapse" }}>
									<thead>
										<tr style={{ background: "#eee", textAlign: "left" }}>
											<th style={{ padding: "8px", border: "1px solid #ddd" }}>
												Route Name
											</th>
											<th style={{ padding: "8px", border: "1px solid #ddd" }}>
												Trips Completed
											</th>
											<th style={{ padding: "8px", border: "1px solid #ddd" }}>
												Tickets Sold
											</th>
											<th style={{ padding: "8px", border: "1px solid #ddd" }}>
												Total Revenue
											</th>
										</tr>
									</thead>
									<tbody>
										{analytics.routes.map((route: any, index: number) => (
											<tr key={index}>
												<td
													style={{ padding: "8px", border: "1px solid #ddd" }}
												>
													{route.route_name}
												</td>
												<td
													style={{ padding: "8px", border: "1px solid #ddd" }}
												>
													{route.trips}
												</td>
												<td
													style={{ padding: "8px", border: "1px solid #ddd" }}
												>
													{route.tickets}
												</td>
												<td
													style={{ padding: "8px", border: "1px solid #ddd" }}
												>
													₹{route.revenue_inr}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					) : (
						<p>No analytics reports data available.</p>
					)}
				</div>
			)}

			{/* 5. Complaints */}
			{activeTab === "complaints" && (
				<div className="space-y-4">
					{complaints.map((c) => (
						<article
							key={c.id}
							className="rounded-none border-2 p-3 neo-shadow"
							style={{
								borderColor: "var(--text-primary)",
								background: "var(--bg-surface)",
							}}
						>
							<p
								className="text-sm font-bold"
								style={{ color: "var(--text-primary)" }}
							>
								{c.busNumber} • {c.category}
							</p>
							<p className="text-xs" style={{ color: "var(--text-muted)" }}>
								{c.description}
							</p>
							{c.status === "pending" && (
								<button
									type="button"
									onClick={() =>
										startTransition(async () => {
											const r = await resolveComplaintAction(c.id);
											r.success
												? toast.success("Complaint resolved")
												: toast.error(r.error ?? "Failed");
										})
									}
									className="mt-2 h-8 rounded-none border-2 px-2 text-xs font-bold uppercase neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none"
									style={{
										borderColor: "var(--text-primary)",
										color: "var(--text-primary)",
									}}
								>
									RESOLVE
								</button>
							)}
						</article>
					))}
				</div>
			)}

			{open && (
				<BusRequestModal
					stops={stops}
					onClose={() => setOpen(false)}
					isPending={isPending}
					onSubmit={(data) =>
						startTransition(async () => {
							const r = await submitBusRequestAction(data);
							if (r.success) {
								toast.success("Bus registration request submitted");
								setOpen(false);
							} else {
								toast.error(r.error ?? "Failed");
							}
						})
					}
				/>
			)}
		</div>
	);
}
