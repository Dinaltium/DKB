"use client";

import { DocUploadField } from "@/components/shared/DocUploadField";
import { applyPassAction, getMyPassesAction } from "@/lib/actions/passes";
import { saveTravelHistoryAction } from "@/lib/actions/travel-history";
import type { Payment, TravelHistory } from "@/lib/db/schema";
import { Clock, MapPin, Receipt } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface Props {
	travelHistory: TravelHistory[];
	payments: Payment[];
	user: {
		name?: string | null;
		email?: string | null;
		id?: string | null;
		role?: string | null;
	};
}

export function PassengerDashboard({ travelHistory, payments, user }: Props) {
	const [activeSubTab, setActiveSubTab] = useState<
		"history" | "passes" | "payments"
	>("history");
	const [isPending, startTransition] = useTransition();

	// Passes state
	const [passesList, setPassesList] = useState<any[]>([]);
	const [passType, setPassType] = useState<"student" | "monthly">("student");
	const [studentName, setStudentName] = useState("");
	const [collegeName, setCollegeName] = useState("");
	const [studentIdNumber, setStudentIdNumber] = useState("");
	const [yearOfPassing, setYearOfPassing] = useState("");
	const [feeTxnId, setFeeTxnId] = useState("");

	// OCR Ticket Scanner states
	const [showScanner, setShowScanner] = useState(false);
	const [ocrBusNumber, setOcrBusNumber] = useState("");
	const [ocrFromStop, setOcrFromStop] = useState("");
	const [ocrToStop, setOcrToStop] = useState("");
	const [ocrFare, setOcrFare] = useState("");
	const [ocrTravelDate, setOcrTravelDate] = useState("");
	const [rawOcrText, setRawOcrText] = useState("");

	const handleSaveScannedTicket = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!ocrBusNumber ||
			!ocrFromStop ||
			!ocrToStop ||
			!ocrFare ||
			!ocrTravelDate
		) {
			toast.error("Please fill in all scanned ticket fields");
			return;
		}

		startTransition(async () => {
			const res = await saveTravelHistoryAction({
				busNumber: ocrBusNumber,
				fromStop: ocrFromStop,
				toStop: ocrToStop,
				scannedFare: Number(ocrFare),
				travelDate: ocrTravelDate,
				rawOcrText: rawOcrText || undefined,
			});

			if (res.success) {
				toast.success("Ticket logged to Travel History!");
				setShowScanner(false);
				setOcrBusNumber("");
				setOcrFromStop("");
				setOcrToStop("");
				setOcrFare("");
				setOcrTravelDate("");
				setRawOcrText("");
				window.location.reload();
			} else {
				toast.error(res.error || "Failed to save scanned ticket");
			}
		});
	};

	useEffect(() => {
		if (activeSubTab === "passes") {
			loadPasses();
		}
	}, [activeSubTab]);

	const loadPasses = async () => {
		try {
			const res = await getMyPassesAction();
			if (res.success && res.data) {
				setPassesList(res.data);
			}
		} catch (err) {
			toast.error(`Failed to load passes: ${(err as Error).message}`);
		}
	};

	const handleApplyPass = async (e: React.FormEvent) => {
		e.preventDefault();
		startTransition(async () => {
			const res = await applyPassAction({
				passType,
				studentName: passType === "student" ? studentName : undefined,
				collegeName: passType === "student" ? collegeName : undefined,
				studentIdNumber: passType === "student" ? studentIdNumber : undefined,
				yearOfPassing:
					passType === "student" ? Number(yearOfPassing) : undefined,
				feeTxnId,
			});
			if (res.success) {
				toast.success("Pass application submitted successfully!");
				setStudentName("");
				setCollegeName("");
				setStudentIdNumber("");
				setYearOfPassing("");
				setFeeTxnId("");
				loadPasses();
			} else {
				toast.error(res.error || "Failed to apply for pass");
			}
		});
	};

	const cardStyle = {
		background: "var(--bg-surface)",
		borderColor: "var(--border-default)",
	};

	const totalSpent = payments
		.filter((p) => p.status === "success")
		.reduce((sum, p) => sum + p.amount, 0);

	const overchargedTrips = travelHistory.filter(
		(t) => (t.overchargeDelta ?? 0) > 0,
	);

	return (
		<div className="space-y-8">
			{/* Stats row */}
			<section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
				<StatCard
					icon={<Clock className="theme-text-teal h-5 w-5" />}
					label="Total Trips"
					value={travelHistory.length}
				/>
				<StatCard
					icon={<Receipt className="theme-text-teal h-5 w-5" />}
					label="Total Spent"
					value={`₹${totalSpent}`}
				/>
				<StatCard
					icon={<MapPin className="theme-text-danger h-5 w-5" />}
					label="Overcharge Alerts"
					value={overchargedTrips.length}
					alert={overchargedTrips.length > 0}
				/>
			</section>

			{/* Sub tabs navigation */}
			<div
				className="flex gap-2 border-b-2"
				style={{ borderColor: "var(--border-default)" }}
			>
				<button
					onClick={() => setActiveSubTab("history")}
					className={`px-4 py-2 text-sm font-bold uppercase ${activeSubTab === "history" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
				>
					Travel History
				</button>
				<button
					onClick={() => setActiveSubTab("passes")}
					className={`px-4 py-2 text-sm font-bold uppercase ${activeSubTab === "passes" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
				>
					Bus Passes
				</button>
				<button
					onClick={() => setActiveSubTab("payments")}
					className={`px-4 py-2 text-sm font-bold uppercase ${activeSubTab === "payments" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
				>
					Payments
				</button>
			</div>

			{/* ── Sub tab content ── */}

			{/* 1. Travel History */}
			{activeSubTab === "history" && (
				<section className="space-y-4">
					{/* Ticket OCR Scanner Card */}
					<div
						className="border-2 p-4"
						style={{
							background: "var(--bg-surface)",
							borderColor: "var(--border-default)",
						}}
					>
						<div className="flex justify-between items-center">
							<div>
								<h3 className="text-sm font-bold uppercase tracking-wide">
									Log Physical Bus Ticket
								</h3>
								<p className="text-[10px] text-muted-foreground mt-0.5">
									Upload a photo of your ticket. Our OCR will scan and calculate
									if you were overcharged!
								</p>
							</div>
							<button
								type="button"
								onClick={() => setShowScanner(!showScanner)}
								className="theme-btn-secondary brutal-transition brutal-hover px-3 py-1.5 border-2 text-xs font-bold uppercase tracking-wide neo-shadow cursor-pointer"
								style={{
									background: showScanner
										? "var(--status-stopped-bg)"
										: "var(--cta-bg)",
									color: "var(--text-primary)",
								}}
							>
								{showScanner ? "Close Scanner" : "📷 Scan Ticket"}
							</button>
						</div>

						{showScanner && (
							<div
								className="mt-4 space-y-4 border-t pt-4"
								style={{ borderColor: "var(--border-default)" }}
							>
								<DocUploadField
									label="Upload Bus Ticket Image"
									placeholder="Scanning image..."
									value={ocrBusNumber}
									onChange={setOcrBusNumber}
									docType="bus_ticket"
									primaryKey="bus_number"
									onExtraFields={(fields) => {
										if (fields.bus_number) setOcrBusNumber(fields.bus_number);
										if (fields.from_stop) setOcrFromStop(fields.from_stop);
										if (fields.to_stop) setOcrToStop(fields.to_stop);
										if (fields.fare) setOcrFare(fields.fare);
										if (fields.ticket_date)
											setOcrTravelDate(fields.ticket_date);
										if (fields.rawOcrText) setRawOcrText(fields.rawOcrText);
									}}
								/>

								<form onSubmit={handleSaveScannedTicket} className="space-y-3">
									<div className="grid gap-3 grid-cols-2">
										<div>
											<label className="block text-[10px] font-bold uppercase mb-1">
												Bus License Plate / Number
											</label>
											<input
												type="text"
												value={ocrBusNumber}
												onChange={(e) => setOcrBusNumber(e.target.value)}
												required
												className="w-full border-2 p-2 font-mono text-sm"
												placeholder="e.g. KA-19-F-1234"
											/>
										</div>
										<div>
											<label className="block text-[10px] font-bold uppercase mb-1">
												Scanned Fare (₹)
											</label>
											<input
												type="number"
												value={ocrFare}
												onChange={(e) => setOcrFare(e.target.value)}
												required
												className="w-full border-2 p-2 font-mono text-sm"
												placeholder="e.g. 50"
											/>
										</div>
									</div>

									<div className="grid gap-3 grid-cols-2">
										<div>
											<label className="block text-[10px] font-bold uppercase mb-1">
												From Stop
											</label>
											<input
												type="text"
												value={ocrFromStop}
												onChange={(e) => setOcrFromStop(e.target.value)}
												required
												className="w-full border-2 p-2 font-mono text-sm"
												placeholder="e.g. Mangalore"
											/>
										</div>
										<div>
											<label className="block text-[10px] font-bold uppercase mb-1">
												To Stop
											</label>
											<input
												type="text"
												value={ocrToStop}
												onChange={(e) => setOcrToStop(e.target.value)}
												required
												className="w-full border-2 p-2 font-mono text-sm"
												placeholder="e.g. Udupi"
											/>
										</div>
									</div>

									<div>
										<label className="block text-[10px] font-bold uppercase mb-1">
											Travel Date
										</label>
										<input
											type="date"
											value={ocrTravelDate}
											onChange={(e) => setOcrTravelDate(e.target.value)}
											required
											className="w-full border-2 p-2 font-mono text-sm"
										/>
									</div>

									<button
										type="submit"
										disabled={isPending}
										className="w-full border-2 p-2.5 font-bold uppercase text-sm neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
										style={{
											background: "var(--cta-bg)",
											color: "var(--text-primary)",
										}}
									>
										{isPending
											? "Logging Ticket..."
											: "Log Ticket to Travel History"}
									</button>
								</form>
							</div>
						)}
					</div>

					{travelHistory.length === 0 ? (
						<div className="ticket-stub rounded-none border-2 border-foreground p-8 text-center neo-shadow">
							<p className="text-sm" style={{ color: "var(--text-muted)" }}>
								No trips recorded yet. Book a ticket to start your journey.
							</p>
							<Link
								href="/trips"
								className="theme-btn-primary brutal-transition brutal-hover mt-4 inline-flex h-10 items-center border-2 px-5 text-xs font-bold uppercase tracking-wide neo-shadow"
							>
								Search & Book Trips
							</Link>
						</div>
					) : (
						<div className="space-y-3">
							{travelHistory.map((trip) => {
								const overcharged = (trip.overchargeDelta ?? 0) > 0;
								return (
									<article
										key={trip.id}
										className="rounded-none border-2 p-4 neo-shadow"
										style={cardStyle}
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<p
													className="text-2xl font-extrabold"
													style={{
														fontFamily: "'Barlow Condensed', sans-serif",
													}}
												>
													{trip.busNumber ?? "Unknown Bus"}
												</p>
												<p
													className="text-sm"
													style={{ color: "var(--text-secondary)" }}
												>
													{trip.fromStop} → {trip.toStop}
												</p>
												<p
													className="mt-1 text-xs"
													style={{ color: "var(--text-muted)" }}
												>
													{trip.travelDate
														? new Date(trip.travelDate).toLocaleDateString(
																"en-IN",
																{ dateStyle: "medium" },
															)
														: new Date(trip.createdAt).toLocaleDateString(
																"en-IN",
																{ dateStyle: "medium" },
															)}
												</p>
											</div>
											<div className="text-right">
												<p className="theme-text-teal text-lg font-bold">
													₹{trip.scannedFare}
												</p>
												{overcharged && (
													<span
														className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold"
														style={{
															background: "var(--status-stopped-bg)",
															color: "var(--status-stopped-text)",
															borderColor: "var(--status-stopped-border)",
														}}
													>
														+₹{trip.overchargeDelta} overcharged
													</span>
												)}
											</div>
										</div>
									</article>
								);
							})}
						</div>
					)}
				</section>
			)}

			{/* 2. Bus Passes */}
			{activeSubTab === "passes" && (
				<section className="grid gap-6 md:grid-cols-2">
					{/* Apply Pass Form */}
					<div
						className="border-2 p-4"
						style={{
							background: "var(--bg-surface)",
							borderColor: "var(--border-default)",
						}}
					>
						<h3 className="mb-4 text-lg font-bold uppercase tracking-wide">
							Apply for Bus Pass
						</h3>
						<form onSubmit={handleApplyPass} className="space-y-4">
							<div>
								<label className="block text-xs font-bold uppercase mb-1">
									Pass Type
								</label>
								<select
									value={passType}
									onChange={(e: any) => setPassType(e.target.value)}
									className="w-full border-2 p-2 font-mono text-sm"
								>
									<option value="student">Student Pass (50% Discount)</option>
									<option value="monthly">Monthly Pass (15% Discount)</option>
								</select>
							</div>

							{passType === "student" && (
								<>
									<div>
										<label className="block text-xs font-bold uppercase mb-1">
											Full Student Name
										</label>
										<input
											type="text"
											value={studentName}
											onChange={(e) => setStudentName(e.target.value)}
											required
											className="w-full border-2 p-2 font-mono text-sm"
											placeholder="Enter your name"
										/>
									</div>
									<div>
										<label className="block text-xs font-bold uppercase mb-1">
											College/Institution Name
										</label>
										<input
											type="text"
											value={collegeName}
											onChange={(e) => setCollegeName(e.target.value)}
											required
											className="w-full border-2 p-2 font-mono text-sm"
											placeholder="College Name"
										/>
									</div>
									<div className="grid gap-2 grid-cols-2">
										<div>
											<label className="block text-xs font-bold uppercase mb-1">
												Student ID Number
											</label>
											<input
												type="text"
												value={studentIdNumber}
												onChange={(e) => setStudentIdNumber(e.target.value)}
												required
												className="w-full border-2 p-2 font-mono text-sm"
												placeholder="ID Number"
											/>
										</div>
										<div>
											<label className="block text-xs font-bold uppercase mb-1">
												Year of Passing
											</label>
											<input
												type="number"
												value={yearOfPassing}
												onChange={(e) => setYearOfPassing(e.target.value)}
												required
												className="w-full border-2 p-2 font-mono text-sm"
												placeholder="YYYY"
											/>
										</div>
									</div>
								</>
							)}

							<div>
								<label className="block text-xs font-bold uppercase mb-1">
									Application Fee Transaction ID (₹50)
								</label>
								<input
									type="text"
									value={feeTxnId}
									onChange={(e) => setFeeTxnId(e.target.value)}
									required
									className="w-full border-2 p-2 font-mono text-sm"
									placeholder="UPI / Bank Txn Ref"
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
								{isPending ? "SUBMITTING..." : "SUBMIT APPLICATION"}
							</button>
						</form>
					</div>

					{/* My Passes List */}
					<div className="space-y-4">
						<h3 className="text-lg font-bold uppercase tracking-wide">
							My Passes
						</h3>
						{passesList.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								You have not applied for any passes yet.
							</p>
						) : (
							passesList.map((pass) => (
								<article
									key={pass.id}
									className="border-2 p-4 space-y-2"
									style={cardStyle}
								>
									<div className="flex justify-between items-center">
										<h4 className="font-extrabold uppercase text-lg">
											{pass.passType} Pass
										</h4>
										<span
											className="px-2 py-0.5 text-[10px] font-bold uppercase border"
											style={
												pass.status === "active"
													? {
															background: "var(--status-running-bg)",
															color: "var(--status-running-text)",
															borderColor: "var(--status-running-border)",
														}
													: {
															background: "var(--status-stopped-bg)",
															color: "var(--status-stopped-text)",
															borderColor: "var(--status-stopped-border)",
														}
											}
										>
											{pass.status}
										</span>
									</div>
									<p className="text-xs">
										<strong>UID:</strong> {pass.passUid}
									</p>
									{pass.studentName && (
										<p className="text-xs">
											<strong>Name:</strong> {pass.studentName}
										</p>
									)}
									{pass.collegeName && (
										<p className="text-xs">
											<strong>College:</strong> {pass.collegeName}
										</p>
									)}
									{pass.validFrom && (
										<p className="text-xs">
											<strong>Validity:</strong>{" "}
											{new Date(pass.validFrom).toLocaleDateString()} -{" "}
											{new Date(pass.validUntil).toLocaleDateString()}
										</p>
									)}
									{pass.rejectionReason && (
										<p className="text-xs text-red-600">
											<strong>Reason:</strong> {pass.rejectionReason}
										</p>
									)}
								</article>
							))
						)}
					</div>
				</section>
			)}

			{/* 4. Payments list */}
			{activeSubTab === "payments" && (
				<section>
					{payments.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No payments logged yet.
						</p>
					) : (
						<div className="space-y-2">
							{payments.map((p) => (
								<div
									key={p.id}
									className="flex items-center justify-between border-2 px-4 py-3 text-sm"
									style={cardStyle}
								>
									<div>
										<span className="font-semibold">Bus {p.busNumber}</span>
										<span className="ml-2 text-xs text-muted-foreground">
											{new Date(p.createdAt).toLocaleDateString("en-IN")}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="theme-text-teal font-bold">
											₹{p.amount}
										</span>
										<span
											className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
											style={
												p.status === "success"
													? {
															background: "var(--status-running-bg)",
															color: "var(--status-running-text)",
															borderColor: "var(--status-running-border)",
														}
													: {
															background: "var(--status-stopped-bg)",
															color: "var(--status-stopped-text)",
															borderColor: "var(--status-stopped-border)",
														}
											}
										>
											{p.status}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</section>
			)}
		</div>
	);
}

function StatCard({
	icon,
	label,
	value,
	alert,
}: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
	alert?: boolean;
}) {
	return (
		<div
			className="rounded-none border-2 p-5 neo-shadow"
			style={{
				background: "var(--bg-surface)",
				borderColor: "var(--border-default)",
			}}
		>
			<div className="flex items-center gap-2">
				{icon}
				<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
					{label}
				</p>
			</div>
			<p
				className={`mt-2 text-4xl font-extrabold ${alert ? "theme-text-danger" : "theme-text-teal"}`}
				style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
			>
				{value}
			</p>
		</div>
	);
}
