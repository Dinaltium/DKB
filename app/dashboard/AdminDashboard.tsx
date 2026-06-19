"use client";

import { AddBusModal } from "@/components/modals/AddBusModal";
import { CreateOperatorModal } from "@/components/modals/CreateOperatorModal";
import { ImportStopsModal } from "@/components/modals/ImportStopsModal";
import { OperatorModal } from "@/components/modals/OperatorModal";
import { BusInfoPanel } from "@/components/shared/BusInfoPanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	addStopAction,
	adminAddBusAction,
	approveBusRequestAction,
	createOperatorAction,
	deleteStopAction,
	importStopsAction,
	rejectBusRequestAction,
	resolveComplaintAction,
} from "@/lib/actions/bus";
import { getPendingPassesAction, verifyPassAction } from "@/lib/actions/passes";
import {
	addStopToRouteAction,
	createRouteAction,
	deleteRouteAction,
	getRoutesAction,
	setFareAction,
} from "@/lib/actions/routes-admin";
import {
	getPendingSubscriptionsAction,
	verifySubscriptionAction,
} from "@/lib/actions/subscriptions";
import type { BusWithRouteIds } from "@/lib/db/queries";
import type {
	BusRequest,
	Complaint,
	Operator,
	Payment,
	Stop,
} from "@/lib/db/schema";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

export interface OperatorRow {
	operator: Operator;
	user: {
		name: string | null;
		email: string | null;
		mustChangePassword: boolean;
		passwordExpiresAt: Date | null;
		createdAt: Date;
	};
}
interface BusRequestRow {
	request: BusRequest;
	operator: Operator;
	user: { name: string | null; email: string | null };
}
interface Props {
	buses: BusWithRouteIds[];
	operators: OperatorRow[];
	complaints: Complaint[];
	busRequests: BusRequestRow[];
	stops: Stop[];
	payments: Payment[];
}
type Tab =
	| "operators"
	| "buses"
	| "routes"
	| "subscriptions"
	| "passes"
	| "complaints"
	| "stops";

const slugify = (name: string) =>
	name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-");

// ── Inline Bus Info Modal ─────────────────────────────────────────────────────

function BusInfoModal({
	bus,
	allStops,
	operatorName,
	complaints,
	payments,
	onClose,
}: {
	bus: BusWithRouteIds;
	allStops: Stop[];
	operatorName?: string;
	complaints: Complaint[];
	payments: Payment[];
	onClose: () => void;
}) {
	return (
		<>
			<div className="fixed inset-0 z-40 bg-black/60" />
			<div
				className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border-2 border-foreground"
				style={{
					background: "var(--bg-surface)",
					maxHeight: "90vh",
					boxShadow: "6px 6px 0 var(--shadow-color)",
				}}
			>
				{/* Header */}
				<div className="flex shrink-0 items-center justify-between border-b-2 border-foreground px-4 py-3">
					<p
						className="text-xl font-black uppercase tracking-wide"
						style={{
							fontFamily: "'Barlow Condensed', sans-serif",
							color: "var(--text-primary)",
						}}
					>
						Bus {bus.number}
					</p>
					<button
						type="button"
						onClick={onClose}
						className="flex h-8 w-8 items-center justify-center border-2 border-foreground font-black text-sm hover:bg-foreground hover:text-background transition-colors"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Body */}
				<div
					className="flex-1 min-h-0 overflow-y-auto p-4"
					style={{
						scrollbarWidth: "thin",
						scrollbarColor: "var(--text-primary) transparent",
					}}
				>
					<BusInfoPanel
						bus={bus}
						allStops={allStops}
						operatorName={operatorName}
						complaints={complaints}
						payments={payments}
						mode="admin"
						onSaved={() => {
							toast.success("Bus updated");
							onClose();
						}}
					/>
				</div>
			</div>
		</>
	);
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminDashboard({
	buses,
	operators,
	complaints,
	busRequests,
	stops,
	payments,
}: Props) {
	const [tab, setTab] = useState<Tab>("operators");
	const [isPending, startTransition] = useTransition();
	const [addBusOpen, setAddBusOpen] = useState(false);
	const [createOpOpen, setCreateOpOpen] = useState(false);
	const [operatorModal, setOperatorModal] = useState<{
		id: string;
		mode: "admin" | "view";
	} | null>(null);

	// Bus info modal
	const [busInfoModal, setBusInfoModal] = useState<string | null>(null);
	const [pendingBusRequestModal, setPendingBusRequestModal] = useState<
		string | null
	>(null);

	const pendingRequestRow = useMemo(() => {
		if (!pendingBusRequestModal) return null;
		return (
			busRequests.find((r) => r.request.id === pendingBusRequestModal) || null
		);
	}, [pendingBusRequestModal, busRequests]);

	const pendingRequestBus = useMemo((): BusWithRouteIds | null => {
		if (!pendingRequestRow) return null;
		return {
			id: pendingRequestRow.request.id,
			number: pendingRequestRow.request.number,
			operatorId: pendingRequestRow.request.operatorId,
			licensePlate: pendingRequestRow.request.licensePlate,
			origin: pendingRequestRow.request.origin,
			destination: pendingRequestRow.request.destination,
			fullFare: pendingRequestRow.request.fullFare,
			driverName: pendingRequestRow.request.driverName,
			conductorName: pendingRequestRow.request.conductorName,
			status: "Not Running",
			statusNote: "Pending Approval",
			schedule: pendingRequestRow.request.schedule,
			totalSeats: pendingRequestRow.request.totalSeats,
			occupiedSeats: 0,
			womenReservedTotal: pendingRequestRow.request.womenReservedTotal,
			womenReservedAvailable: pendingRequestRow.request.womenReservedTotal,
			studentCardAccepted: pendingRequestRow.request.studentCardAccepted,
			studentDiscountPercent: pendingRequestRow.request.studentDiscountPercent,
			votes: { onTime: 0, slightlyLate: 0, veryLate: 0 },
			routeGeometry: null,
			seatLayout: "2x2",
			qrCodeData: null,
			isLive: false,
			updatedAt: new Date(),
			routeStopIds: pendingRequestRow.request.routeStopIds,
		};
	}, [pendingRequestRow]);

	const [importPreview, setImportPreview] = useState<Stop[] | null>(null);
	const [stopSearch, setStopSearch] = useState("");
	const [showAddStop, setShowAddStop] = useState(false);
	const [newStopName, setNewStopName] = useState("");
	const [newStopId, setNewStopId] = useState("");
	const [newStopLat, setNewStopLat] = useState("");
	const [newStopLng, setNewStopLng] = useState("");
	const fileRef = useRef<HTMLInputElement | null>(null);

	// Route Admin states
	const [routesList, setRoutesList] = useState<any[]>([]);
	const [newRouteName, setNewRouteName] = useState("");
	const [startCity, setStartCity] = useState("");
	const [endCity, setEndCity] = useState("");
	const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
	const [routeStopsInput, setRouteStopsInput] = useState<
		{ name: string; order: number }[]
	>([]);
	const [faresInput, setFaresInput] = useState<
		{ fromStopId: number; toStopId: number; fare: number }[]
	>([]);

	// Subscriptions / Passes verification states
	const [pendingSubs, setPendingSubs] = useState<any[]>([]);
	const [pendingPasses, setPendingPasses] = useState<any[]>([]);
	const [rejectionReason, setRejectionReason] = useState("");

	useEffect(() => {
		if (tab === "routes") {
			loadRoutes();
		} else if (tab === "subscriptions") {
			loadPendingSubs();
		} else if (tab === "passes") {
			loadPendingPasses();
		}
	}, [tab]);

	const loadRoutes = async () => {
		const res = await getRoutesAction();
		if (res.success && res.data) {
			setRoutesList(res.data);
		}
	};

	const loadPendingSubs = async () => {
		const res = await getPendingSubscriptionsAction();
		if (res.success && res.data) {
			setPendingSubs(res.data);
		}
	};

	const loadPendingPasses = async () => {
		const res = await getPendingPassesAction();
		if (res.success && res.data) {
			setPendingPasses(res.data);
		}
	};

	const handleCreateRoute = async (e: React.FormEvent) => {
		e.preventDefault();
		startTransition(async () => {
			const res = await createRouteAction({
				routeName: newRouteName,
				startCity,
				endCity,
			});
			if (res.success) {
				toast.success("Route created successfully");
				setNewRouteName("");
				setStartCity("");
				setEndCity("");
				loadRoutes();
			} else {
				toast.error(res.error || "Failed to create route");
			}
		});
	};

	const handleAddRouteStop = async (
		routeId: number,
		stopName: string,
		stopOrder: number,
	) => {
		startTransition(async () => {
			const res = await addStopToRouteAction({
				routeId,
				stopName,
				stopOrder,
			});
			if (res.success) {
				toast.success("Stop added to route");
				loadRoutes();
			} else {
				toast.error(res.error || "Failed to add stop");
			}
		});
	};

	const handleSetFare = async (
		routeId: number,
		fromStopId: number,
		toStopId: number,
		fareInr: number,
	) => {
		startTransition(async () => {
			const res = await setFareAction({
				routeId,
				fromStopId,
				toStopId,
				fareInr,
			});
			if (res.success) {
				toast.success("Fare updated");
			} else {
				toast.error(res.error || "Failed to set fare");
			}
		});
	};

	const handleVerifySub = async (
		subscriptionId: number,
		action: "approve" | "reject",
	) => {
		startTransition(async () => {
			const res = await verifySubscriptionAction({
				subscriptionId,
				action,
				rejectionReason: action === "reject" ? rejectionReason : undefined,
			});
			if (res.success) {
				toast.success(`Subscription ${action}d`);
				setRejectionReason("");
				loadPendingSubs();
			} else {
				toast.error(res.error || "Failed verification");
			}
		});
	};

	const handleVerifyPass = async (
		passId: number,
		action: "approve" | "reject",
	) => {
		startTransition(async () => {
			const res = await verifyPassAction({
				passId,
				action,
				rejectionReason: action === "reject" ? rejectionReason : undefined,
			});
			if (res.success) {
				toast.success(`Pass ${action}d`);
				setRejectionReason("");
				loadPendingPasses();
			} else {
				toast.error(res.error || "Failed verification");
			}
		});
	};

	const filteredStops = useMemo(
		() =>
			stops.filter((s) =>
				s.name.toLowerCase().includes(stopSearch.toLowerCase()),
			),
		[stops, stopSearch],
	);

	const busesByOperatorId = useMemo(() => {
		const map: Record<string, BusWithRouteIds[]> = {};
		for (const b of buses) {
			if (!b.operatorId) continue;
			map[b.operatorId] = map[b.operatorId] ?? [];
			map[b.operatorId].push(b);
		}
		return map;
	}, [buses]);

	const operatorById = Object.fromEntries(
		operators.map((o) => [o.operator.id, o]),
	);

	const operatorNameForBus = (bus: BusWithRouteIds): string | undefined => {
		if (!bus.operatorId) return undefined;
		return operatorById[bus.operatorId]?.operator.companyName;
	};

	const handleImportPick = (file: File) => {
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const parsed = JSON.parse(String(reader.result)) as Stop[];
				const valid =
					Array.isArray(parsed) &&
					parsed.every(
						(s) =>
							typeof s.id === "string" &&
							typeof s.name === "string" &&
							typeof s.lat === "number" &&
							typeof s.lng === "number",
					);
				if (!valid) {
					toast.error(
						"Invalid JSON format. Expected array of {id, name, lat, lng}",
					);
					return;
				}
				setImportPreview(parsed);
			} catch {
				toast.error(
					"Invalid JSON format. Expected array of {id, name, lat, lng}",
				);
			}
		};
		reader.readAsText(file);
	};

	const exportStops = () => {
		const blob = new Blob([JSON.stringify(stops, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "buslink-stops.json";
		a.click();
		URL.revokeObjectURL(url);
	};

	const modalRow = operatorModal ? operatorById[operatorModal.id] : undefined;
	const busInfoModalBus = busInfoModal
		? buses.find((b) => b.id === busInfoModal)
		: null;

	return (
		<div className="space-y-5">
			{/* Tab bar */}
			<div
				className="flex gap-2 border-b-2"
				style={{ borderColor: "var(--border-default)" }}
			>
				{(
					[
						"operators",
						"buses",
						"routes",
						"subscriptions",
						"passes",
						"complaints",
						"stops",
					] as const
				).map((id) => (
					<button
						key={id}
						onClick={() => setTab(id)}
						className="px-4 py-2 text-sm font-bold uppercase tracking-wide"
						style={{
							color: tab === id ? "var(--text-primary)" : "var(--text-muted)",
							borderBottom:
								tab === id
									? "2px solid var(--cta-bg)"
									: "2px solid transparent",
							marginBottom: "-2px",
							fontFamily: "'Barlow Condensed', sans-serif",
						}}
					>
						{id}
					</button>
				))}
			</div>

			{/* 1. OPERATORS */}
			{tab === "operators" && (
				<section className="space-y-3">
					<Button
						type="button"
						onClick={() => setCreateOpOpen(true)}
						className="h-10 rounded-none border-2 border-foreground font-bold uppercase neo-shadow"
					>
						+ Create operator account
					</Button>
					{operators.map(({ operator, user }) => {
						const opBuses = busesByOperatorId[operator.id] ?? [];
						const shown = opBuses.slice(0, 2);
						const extra = opBuses.length - shown.length;
						return (
							<article
								key={operator.id}
								className="border-2 p-4"
								style={{
									background: "var(--bg-surface)",
									borderColor: "var(--text-primary)",
									boxShadow: "4px 4px 0 var(--text-primary)",
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
									{user.email ?? "No email"}{" "}
									{operator.phone ? ` • ${operator.phone}` : ""}
								</p>
								<div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
									{opBuses.length === 0 ? (
										<span style={{ color: "var(--text-muted)" }}>
											No buses registered
										</span>
									) : (
										<>
											{shown.map((b) => (
												<span
													key={b.id}
													className="border-2 px-2 py-0.5 text-[10px] font-black"
													style={{
														background: "var(--cta-bg)",
														borderColor: "var(--text-primary)",
														color: "var(--text-primary)",
													}}
												>
													{b.number}
												</span>
											))}
											{extra > 0 && (
												<span
													className="border-2 px-2 py-0.5 text-[10px] font-black"
													style={{
														borderColor: "var(--text-primary)",
														color: "var(--text-primary)",
													}}
												>
													+{extra} more
												</span>
											)}
										</>
									)}
									<span className="ml-auto">
										<StatusBadge
											status={operator.approved ? "approved" : "pending"}
										/>
									</span>
								</div>
								<div className="mt-4 flex flex-wrap gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() =>
											setOperatorModal({ id: operator.id, mode: "admin" })
										}
										className="h-9 rounded-none border-2 border-foreground font-bold uppercase neo-shadow"
									>
										VIEW DETAILS →
									</Button>
								</div>
							</article>
						);
					})}
				</section>
			)}

			{/* 2. BUSES */}
			{tab === "buses" && (
				<section className="space-y-3">
					<Button
						type="button"
						onClick={() => setAddBusOpen(true)}
						className="h-10 rounded-none border-2 border-foreground font-bold uppercase neo-shadow"
					>
						+ ADD BUS
					</Button>

					{buses.map((bus) => (
						<div
							key={bus.id}
							className="border-2 p-3"
							style={{
								background: "var(--bg-surface)",
								borderColor: "var(--text-primary)",
							}}
						>
							<div className="flex flex-wrap items-center justify-between gap-3">
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
									<p className="text-xs" style={{ color: "var(--text-muted)" }}>
										{bus.origin} → {bus.destination}
										{bus.operatorId && operatorById[bus.operatorId] && (
											<span
												className="ml-2 font-semibold"
												style={{ color: "var(--text-secondary)" }}
											>
												· {operatorById[bus.operatorId].operator.companyName}
											</span>
										)}
									</p>
									<div className="mt-1">
										<StatusBadge status={bus.status} />
									</div>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => setBusInfoModal(bus.id)}
										className="h-9 rounded-none border-2 border-foreground bg-background font-bold uppercase text-foreground neo-shadow"
									>
										VIEW INFO
									</Button>
									<Link
										href={`/bus/${bus.id}`}
										className="inline-flex h-9 items-center rounded-none border-2 border-foreground bg-primary px-3 text-xs font-bold uppercase text-primary-foreground neo-shadow"
									>
										CHECK BUS
									</Link>
								</div>
							</div>
						</div>
					))}

					{busRequests
						.filter((row) => row.request.status === "pending")
						.map((row) => (
							<div
								key={row.request.id}
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
									{row.request.number}
								</p>
								<p className="text-xs" style={{ color: "var(--text-muted)" }}>
									{row.operator.companyName}
								</p>
								<div className="mt-2 flex gap-2">
									<Button
										type="button"
										disabled={isPending}
										variant="outline"
										onClick={() => setPendingBusRequestModal(row.request.id)}
										className="h-8 rounded-none border-2 border-foreground bg-background font-bold uppercase text-foreground neo-shadow"
									>
										VIEW INFO
									</Button>
									<Button
										type="button"
										disabled={isPending}
										variant="outline"
										onClick={() =>
											startTransition(async () => {
												const r = await approveBusRequestAction(row.request.id);
												if (r.success) toast.success("Bus request approved");
												else toast.error(r.error ?? "Failed");
											})
										}
										className="h-8 rounded-none border-2 border-foreground font-bold uppercase neo-shadow"
									>
										APPROVE
									</Button>
									<Button
										type="button"
										disabled={isPending}
										variant="outline"
										onClick={() =>
											startTransition(async () => {
												const r = await rejectBusRequestAction(row.request.id);
												if (r.success) toast.success("Bus request rejected");
												else toast.error(r.error ?? "Failed");
											})
										}
										className="h-8 rounded-none border-2 border-destructive font-bold uppercase text-destructive neo-shadow"
									>
										REJECT
									</Button>
								</div>
							</div>
						))}
				</section>
			)}

			{/* 3. ROUTES & FARES ADMINISTRATION */}
			{tab === "routes" && (
				<section className="grid gap-6 md:grid-cols-2">
					{/* Create Route */}
					<div
						className="border-2 p-4"
						style={{ background: "var(--bg-surface)" }}
					>
						<h3 className="mb-4 text-lg font-bold uppercase">Create Route</h3>
						<form onSubmit={handleCreateRoute} className="space-y-4">
							<Input
								placeholder="Route Name (e.g. Route-1A)"
								value={newRouteName}
								onChange={(e) => setNewRouteName(e.target.value)}
								required
								className="border-2"
							/>
							<Input
								placeholder="Start City"
								value={startCity}
								onChange={(e) => setStartCity(e.target.value)}
								required
								className="border-2"
							/>
							<Input
								placeholder="End City"
								value={endCity}
								onChange={(e) => setEndCity(e.target.value)}
								required
								className="border-2"
							/>
							<Button
								type="submit"
								disabled={isPending}
								className="w-full font-bold uppercase"
							>
								Create Route
							</Button>
						</form>
					</div>

					{/* Route List */}
					<div className="space-y-3">
						<h3 className="text-lg font-bold uppercase">Routes List</h3>
						{routesList.map((r) => (
							<article key={r.id} className="border-2 p-3 space-y-2 bg-white">
								<div className="flex justify-between items-center">
									<h4 className="font-bold">{r.routeName}</h4>
									<span className="text-xs text-muted-foreground">
										{r.stop_count} stops
									</span>
								</div>
								<p className="text-xs">
									{r.startCity} → {r.endCity}
								</p>
								<div className="flex gap-2">
									<Button
										size="xs"
										onClick={() => {
											// Form fields for adding stops/fares
											setSelectedRouteId(r.id);
											toast.info(`Configuring route: ${r.routeName}`);
										}}
									>
										Configure Stops & Fares
									</Button>
									<Button
										variant="destructive"
										size="xs"
										onClick={() =>
											startTransition(async () => {
												const res = await deleteRouteAction(r.id);
												if (res.success) {
													toast.success("Route deactivated");
													loadRoutes();
												}
											})
										}
									>
										Delete
									</Button>
								</div>
							</article>
						))}
					</div>
				</section>
			)}

			{/* 4. SUBSCRIPTIONS VERIFICATION */}
			{tab === "subscriptions" && (
				<section className="space-y-4">
					<h3 className="text-lg font-bold uppercase">Pending Subscriptions</h3>
					{pendingSubs.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No pending subscriptions to verify.
						</p>
					) : (
						pendingSubs.map((sub) => (
							<article key={sub.id} className="border-2 p-4 bg-white space-y-2">
								<p>
									<strong>Operator:</strong> {sub.operatorId}
								</p>
								<p>
									<strong>Buses requested:</strong> {sub.numBuses}
								</p>
								<p>
									<strong>Amount Paid:</strong> ₹{sub.amountPaidInr}
								</p>
								<p>
									<strong>UPI Transaction Reference:</strong> {sub.upiTxnId}
								</p>

								<div className="flex gap-2 items-center">
									<Input
										placeholder="Rejection Reason"
										value={rejectionReason}
										onChange={(e) => setRejectionReason(e.target.value)}
										className="max-w-xs h-8 text-xs"
									/>
									<Button
										onClick={() => handleVerifySub(sub.id, "approve")}
										className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
									>
										APPROVE
									</Button>
									<Button
										onClick={() => handleVerifySub(sub.id, "reject")}
										variant="destructive"
										className="font-bold text-xs"
									>
										REJECT
									</Button>
								</div>
							</article>
						))
					)}
				</section>
			)}

			{/* 5. PASSES VERIFICATION */}
			{tab === "passes" && (
				<section className="space-y-4">
					<h3 className="text-lg font-bold uppercase">Pending Passes</h3>
					{pendingPasses.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No pending pass verifications.
						</p>
					) : (
						pendingPasses.map((pass) => (
							<article
								key={pass.id}
								className="border-2 p-4 bg-white space-y-2"
							>
								<p>
									<strong>Pass Type:</strong> {pass.passType}
								</p>
								{pass.studentName && (
									<p>
										<strong>Student Name:</strong> {pass.studentName}
									</p>
								)}
								{pass.collegeName && (
									<p>
										<strong>College:</strong> {pass.collegeName}
									</p>
								)}
								{pass.studentIdNumber && (
									<p>
										<strong>Student ID:</strong> {pass.studentIdNumber}
									</p>
								)}
								<p>
									<strong>Fee Transaction Ref:</strong> {pass.feeTxnId}
								</p>

								<div className="flex gap-2 items-center">
									<Input
										placeholder="Rejection Reason"
										value={rejectionReason}
										onChange={(e) => setRejectionReason(e.target.value)}
										className="max-w-xs h-8 text-xs"
									/>
									<Button
										onClick={() => handleVerifyPass(pass.id, "approve")}
										className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
									>
										APPROVE
									</Button>
									<Button
										onClick={() => handleVerifyPass(pass.id, "reject")}
										variant="destructive"
										className="font-bold text-xs"
									>
										REJECT
									</Button>
								</div>
							</article>
						))
					)}
				</section>
			)}

			{/* 6. COMPLAINTS */}
			{tab === "complaints" && (
				<section className="space-y-2">
					{complaints.map((c) => (
						<article
							key={c.id}
							className="border-2 p-3 bg-white"
							style={{ borderColor: "var(--text-primary)" }}
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
							<div className="mt-2 flex items-center gap-2">
								<StatusBadge status={c.status} />
								{c.status === "pending" && (
									<Button
										type="button"
										variant="outline"
										onClick={() =>
											startTransition(async () => {
												const r = await resolveComplaintAction(c.id);
												if (r.success) toast.success("Complaint resolved");
												else toast.error(r.error ?? "Failed");
											})
										}
										className="h-8 rounded-none border-2 border-foreground font-bold uppercase neo-shadow"
									>
										RESOLVE
									</Button>
								)}
							</div>
						</article>
					))}
				</section>
			)}

			{/* 7. STOPS */}
			{tab === "stops" && (
				<section className="space-y-3">
					<div className="flex flex-wrap gap-2">
						<input
							ref={fileRef}
							type="file"
							accept=".json"
							className="hidden"
							onChange={(e) => {
								const f = e.target.files?.[0];
								if (f) handleImportPick(f);
								e.currentTarget.value = "";
							}}
						/>
						<Button
							variant="outline"
							onClick={() => fileRef.current?.click()}
							className="h-10 rounded-none border-2 border-foreground font-bold uppercase neo-shadow"
						>
							IMPORT JSON
						</Button>
						<Button
							variant="outline"
							onClick={exportStops}
							className="h-10 rounded-none border-2 border-foreground font-bold uppercase neo-shadow"
						>
							EXPORT JSON
						</Button>
						<Button
							onClick={() => setShowAddStop((v) => !v)}
							className="h-10 rounded-none border-2 border-foreground font-bold uppercase neo-shadow"
						>
							+ ADD STOP
						</Button>
					</div>

					{showAddStop && (
						<form
							className="grid gap-2 border-2 p-3 md:grid-cols-4"
							style={{
								borderColor: "var(--text-primary)",
								background: "var(--bg-surface)",
							}}
							onSubmit={(e) => {
								e.preventDefault();
								startTransition(async () => {
									const res = await addStopAction({
										id: newStopId.trim(),
										name: newStopName.trim(),
										lat: Number(newStopLat),
										lng: Number(newStopLng),
									});
									if (res.success) {
										toast.success("Stop added");
										setNewStopName("");
										setNewStopId("");
										setNewStopLat("");
										setNewStopLng("");
									} else toast.error(res.error ?? "Failed");
								});
							}}
						>
							<Input
								value={newStopName}
								onChange={(e) => {
									setNewStopName(e.target.value);
									setNewStopId(slugify(e.target.value));
								}}
								placeholder="Stop Name"
								required
								className="rounded-none border-2 border-foreground md:col-span-1"
							/>
							<Input
								value={newStopId}
								onChange={(e) => setNewStopId(e.target.value)}
								placeholder="Stop ID"
								required
								className="rounded-none border-2 border-foreground"
							/>
							<Input
								value={newStopLat}
								onChange={(e) => setNewStopLat(e.target.value)}
								type="number"
								step="0.000001"
								placeholder="Latitude"
								required
								className="rounded-none border-2 border-foreground"
							/>
							<Input
								value={newStopLng}
								onChange={(e) => setNewStopLng(e.target.value)}
								type="number"
								step="0.000001"
								placeholder="Longitude"
								required
								className="rounded-none border-2 border-foreground"
							/>
							<Button
								type="submit"
								disabled={isPending}
								className="h-10 rounded-none border-2 border-foreground font-bold uppercase md:col-span-4 neo-shadow"
							>
								Save Stop
							</Button>
						</form>
					)}

					<Input
						value={stopSearch}
						onChange={(e) => setStopSearch(e.target.value)}
						placeholder="Search stops by name..."
						className="h-10 w-full rounded-none border-2 border-foreground"
					/>
					<p
						className="text-xs font-semibold uppercase tracking-widest"
						style={{ color: "var(--text-muted)" }}
					>
						{stops.length} stops total
					</p>

					{filteredStops.length === 0 ? (
						<EmptyState
							title="No stops added yet."
							description="Use Import JSON or Add Stop to get started."
						/>
					) : (
						<ScrollArea className="max-h-[480px]">
							<div className="space-y-2 pr-3">
								{filteredStops.map((s) => (
									<div
										key={s.id}
										className="flex items-center gap-2 border-2 border-foreground px-3 py-2"
										style={{ background: "var(--bg-surface)" }}
									>
										<span
											className="flex-1 text-lg font-bold uppercase"
											style={{
												fontFamily: "'Barlow Condensed', sans-serif",
												color: "var(--text-primary)",
											}}
										>
											{s.name}
										</span>
										<span className="font-mono text-xs text-muted-foreground">
											{s.id}
										</span>
										<span className="text-xs text-muted-foreground">
											{s.lat.toFixed(6)}
										</span>
										<span className="text-xs text-muted-foreground">
											{s.lng.toFixed(6)}
										</span>
										<Button
											type="button"
											disabled={isPending}
											variant="destructive"
											size="icon"
											onClick={() =>
												startTransition(async () => {
													const r = await deleteStopAction(s.id);
													if (r.success) toast.success("Stop deleted");
													else toast.error(r.error ?? "Failed");
												})
											}
											className="h-8 w-8 rounded-none border-2 border-foreground text-xs font-black"
										>
											🗑
										</Button>
									</div>
								))}
							</div>
						</ScrollArea>
					)}
				</section>
			)}

			{/* MODALS */}
			{addBusOpen && (
				<AddBusModal
					operators={operators.filter((o) => o.operator.approved)}
					stops={stops}
					onClose={() => setAddBusOpen(false)}
					onSubmit={(data) =>
						startTransition(async () => {
							const r = await adminAddBusAction(data);
							if (r.success) {
								toast.success("Bus added");
								setAddBusOpen(false);
							} else toast.error(r.error ?? "Failed");
						})
					}
					isPending={isPending}
				/>
			)}

			{createOpOpen && (
				<CreateOperatorModal
					onClose={() => setCreateOpOpen(false)}
					isPending={isPending}
					onSubmit={(data) =>
						startTransition(async () => {
							const r = await createOperatorAction(data);
							if (r.success) {
								toast.success("Operator account created");
								setCreateOpOpen(false);
							} else toast.error(r.error ?? "Failed");
						})
					}
				/>
			)}

			{operatorModal && modalRow && (
				<OperatorModal
					open
					onOpenChange={(o) => {
						if (!o) setOperatorModal(null);
					}}
					operator={modalRow.operator}
					user={{
						name: modalRow.user.name,
						email: modalRow.user.email,
						createdAt: modalRow.user.createdAt,
						mustChangePassword: modalRow.user.mustChangePassword,
					}}
					buses={busesByOperatorId[operatorModal.id] ?? []}
					complaints={complaints}
					payments={payments}
					mode={operatorModal.mode}
					allStops={stops}
				/>
			)}

			{busInfoModal && busInfoModalBus && (
				<BusInfoModal
					bus={busInfoModalBus}
					allStops={stops}
					operatorName={operatorNameForBus(busInfoModalBus)}
					complaints={complaints}
					payments={payments}
					onClose={() => setBusInfoModal(null)}
				/>
			)}

			{pendingBusRequestModal && pendingRequestRow && pendingRequestBus && (
				<>
					<div className="fixed inset-0 z-40 bg-black/60" />
					<div
						className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border-2 border-foreground"
						style={{
							background: "var(--bg-surface)",
							maxHeight: "90vh",
							boxShadow: "6px 6px 0 var(--shadow-color)",
						}}
					>
						{/* Header */}
						<div className="flex shrink-0 items-center justify-between border-b-2 border-foreground px-4 py-3">
							<p
								className="text-xl font-black uppercase tracking-wide"
								style={{
									fontFamily: "'Barlow Condensed', sans-serif",
									color: "var(--text-primary)",
								}}
							>
								Pending Bus Request: {pendingRequestBus.number}
							</p>
							<button
								type="button"
								onClick={() => setPendingBusRequestModal(null)}
								className="flex h-8 w-8 items-center justify-center border-2 border-foreground font-black text-sm hover:bg-foreground hover:text-background transition-colors"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						{/* Body */}
						<div
							className="flex-1 min-h-0 overflow-y-auto p-4"
							style={{
								scrollbarWidth: "thin",
								scrollbarColor: "var(--text-primary) transparent",
							}}
						>
							<BusInfoPanel
								bus={pendingRequestBus}
								allStops={stops}
								operatorName={pendingRequestRow.operator.companyName}
								mode="view"
							/>
						</div>

						{/* Footer Actions */}
						<div className="flex justify-end gap-2 border-t-2 border-foreground p-4 bg-background">
							<Button
								type="button"
								disabled={isPending}
								variant="outline"
								onClick={() =>
									startTransition(async () => {
										const r = await approveBusRequestAction(
											pendingRequestRow.request.id,
										);
										if (r.success) {
											toast.success("Bus request approved");
											setPendingBusRequestModal(null);
										} else {
											toast.error(r.error ?? "Failed");
										}
									})
								}
								className="h-10 rounded-none border-2 border-foreground font-bold uppercase neo-shadow"
							>
								APPROVE
							</Button>
							<Button
								type="button"
								disabled={isPending}
								variant="outline"
								onClick={() =>
									startTransition(async () => {
										const r = await rejectBusRequestAction(
											pendingRequestRow.request.id,
										);
										if (r.success) {
											toast.success("Bus request rejected");
											setPendingBusRequestModal(null);
										} else {
											toast.error(r.error ?? "Failed");
										}
									})
								}
								className="h-10 rounded-none border-2 border-destructive font-bold uppercase text-destructive neo-shadow"
							>
								REJECT
							</Button>
						</div>
					</div>
				</>
			)}

			{importPreview && (
				<ImportStopsModal
					data={importPreview}
					onClose={() => setImportPreview(null)}
					onConfirm={() =>
						startTransition(async () => {
							const r = await importStopsAction(importPreview);
							if (r.success) {
								toast.success(
									`Imported ${r.count ?? importPreview.length} stops`,
								);
								setImportPreview(null);
							} else toast.error(r.error ?? "Failed");
						})
					}
					isPending={isPending}
				/>
			)}
		</div>
	);
}
