"use client";

import { applyPassAction, getMyPassesAction } from "@/lib/actions/passes";
import {
	getLeaderboardAction,
	getMyRewardsAction,
	openChestAction,
	setTitleAction,
} from "@/lib/actions/rewards";
import type { LoyaltyAccount, Payment, TravelHistory } from "@/lib/db/schema";
import {
	Clock,
	Gift,
	MapPin,
	Receipt,
	ShieldAlert,
	Star,
	Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface Props {
	travelHistory: TravelHistory[];
	loyalty: LoyaltyAccount | null;
	payments: Payment[];
	user: {
		name?: string | null;
		email?: string | null;
		id?: string | null;
		role?: string | null;
	};
}

export function PassengerDashboard({
	travelHistory,
	loyalty,
	payments,
	user,
}: Props) {
	const [activeSubTab, setActiveSubTab] = useState<
		"history" | "passes" | "rewards" | "payments"
	>("history");
	const [isPending, startTransition] = useTransition();

	// Rewards state
	const [rewardsProfile, setRewardsProfile] = useState<any>(null);
	const [chestsInfo, setChestsInfo] = useState<any>(null);
	const [stickersList, setStickersList] = useState<any[]>([]);
	const [titlesList, setTitlesList] = useState<any[]>([]);
	const [leaderboard, setLeaderboard] = useState<any[]>([]);
	const [xpHistory, setXpHistory] = useState<any[]>([]);
	const [rewardsLoading, setRewardsLoading] = useState(false);

	// Passes state
	const [passesList, setPassesList] = useState<any[]>([]);
	const [passType, setPassType] = useState<"student" | "monthly">("student");
	const [studentName, setStudentName] = useState("");
	const [collegeName, setCollegeName] = useState("");
	const [studentIdNumber, setStudentIdNumber] = useState("");
	const [yearOfPassing, setYearOfPassing] = useState("");
	const [feeTxnId, setFeeTxnId] = useState("");

	useEffect(() => {
		if (activeSubTab === "rewards") {
			loadRewards();
		} else if (activeSubTab === "passes") {
			loadPasses();
		}
	}, [activeSubTab]);

	const loadRewards = async () => {
		setRewardsLoading(true);
		try {
			const res = await getMyRewardsAction();
			if (res.success && res.data) {
				setRewardsProfile(res.data.profile);
				setChestsInfo(res.data.chests);
				setStickersList(res.data.stickers);
				setTitlesList(res.data.earned_titles);
				setXpHistory(res.data.xp_history);
			}
			const lbRes = await getLeaderboardAction();
			if (lbRes.success && lbRes.data) {
				setLeaderboard(lbRes.data);
			}
		} catch (err) {
			toast.error(`Failed to load rewards: ${(err as Error).message}`);
		} finally {
			setRewardsLoading(false);
		}
	};

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

	const handleOpenChest = async (chestId: number) => {
		startTransition(async () => {
			const res = await openChestAction(chestId);
			if (res.success) {
				toast.success(res.message);
				loadRewards();
			} else {
				toast.error(res.error || "Failed to open chest");
			}
		});
	};

	const handleSetTitle = async (title: string) => {
		startTransition(async () => {
			const res = await setTitleAction(title);
			if (res.success) {
				toast.success("Active title updated");
				loadRewards();
			} else {
				toast.error(res.error || "Failed to set title");
			}
		});
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
			<section className="grid gap-4 md:grid-cols-4">
				<StatCard
					icon={<Clock className="theme-text-teal h-5 w-5" />}
					label="Total Trips"
					value={loyalty?.totalTrips ?? 0}
				/>
				<StatCard
					icon={<Star className="theme-text-amber h-5 w-5" />}
					label="Loyalty Points"
					value={loyalty?.totalPoints ?? 0}
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
					onClick={() => setActiveSubTab("rewards")}
					className={`px-4 py-2 text-sm font-bold uppercase ${activeSubTab === "rewards" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
				>
					XP & Rewards
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
				<section>
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
												{(trip.loyaltyPoints ?? 0) > 0 && (
													<p className="theme-text-amber mt-1 text-[10px] font-bold uppercase tracking-widest">
														+{trip.loyaltyPoints} pts
													</p>
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

			{/* 3. XP & Rewards */}
			{activeSubTab === "rewards" && (
				<section className="space-y-6">
					{rewardsLoading ? (
						<p className="text-sm">Loading XP profile & chests...</p>
					) : (
						<div className="grid gap-6 md:grid-cols-2">
							{/* Pro XP Stats */}
							<div className="border-2 p-4 space-y-4" style={cardStyle}>
								<div className="flex justify-between items-center">
									<h3 className="text-lg font-bold uppercase">XP Profile</h3>
									<span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded">
										{rewardsProfile?.xpLevel || "Newcomer"}
									</span>
								</div>
								<p
									style={{
										fontSize: "28px",
										fontWeight: "extrabold",
										color: "orange",
									}}
								>
									{rewardsProfile?.xpPoints || 0} XP
								</p>
								<p className="text-xs">
									<strong>Active Title:</strong> "
									{rewardsProfile?.activeTitle || "New Rider"}"
								</p>
								<p className="text-xs">
									<strong>Total Travel Distance:</strong>{" "}
									{rewardsProfile?.totalKm || "0.00"} km
								</p>

								{/* XP Titles list */}
								<div>
									<h4 className="text-xs font-bold uppercase mt-4 mb-2">
										Change Active Title
									</h4>
									<div className="flex flex-wrap gap-2">
										{titlesList.map((t) => (
											<button
												key={t.id}
												onClick={() => handleSetTitle(t.title)}
												className={`px-2 py-1 text-xs border ${rewardsProfile?.activeTitle === t.title ? "bg-black text-white font-bold" : "bg-white"}`}
											>
												{t.title} ({t.rarity})
											</button>
										))}
									</div>
								</div>

								{/* Stickers earned */}
								<div>
									<h4 className="text-xs font-bold uppercase mt-4 mb-2">
										My Stickers Collection
									</h4>
									{stickersList.length === 0 ? (
										<p className="text-xs text-muted-foreground">
											No stickers collected yet. Open chests to unlock!
										</p>
									) : (
										<div className="flex flex-wrap gap-2">
											{stickersList.map((s) => (
												<span
													key={s.id}
													className="inline-block border px-2 py-1 text-xs bg-slate-100"
													title={s.rarity}
												>
													🖼️ {s.stickerKey} ({s.rarity})
												</span>
											))}
										</div>
									)}
								</div>
							</div>

							{/* Unopened Loot Chests */}
							<div className="border-2 p-4 space-y-4" style={cardStyle}>
								<h3 className="text-lg font-bold uppercase flex items-center gap-2">
									<Gift className="h-5 w-5 text-amber-500" /> Chests Inventory
								</h3>
								{chestsInfo?.unopened?.length === 0 ? (
									<p className="text-xs text-muted-foreground">
										No unopened chests. Keep riding and earning XP to receive
										chests!
									</p>
								) : (
									<div className="space-y-2">
										{chestsInfo?.unopened?.map((chest: any) => (
											<div
												key={chest.id}
												className="flex justify-between items-center border p-3 bg-white"
											>
												<div>
													<p className="font-bold text-sm uppercase">
														{chest.chestType} Chest
													</p>
													<p className="text-[10px] text-muted-foreground">
														Earned at {chest.xpAtEarn} XP
													</p>
												</div>
												<button
													onClick={() => handleOpenChest(chest.id)}
													className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs"
												>
													OPEN CHEST
												</button>
											</div>
										))}
									</div>
								)}

								{/* Leaderboard Section */}
								<div className="mt-6 border-t pt-4">
									<h4 className="text-sm font-bold uppercase flex items-center gap-2 mb-3">
										<Trophy className="h-4 w-4 text-yellow-500" /> Top 20 Riders
									</h4>
									<div className="space-y-1">
										{leaderboard.map((rider, index) => (
											<div
												key={index}
												className="flex justify-between items-center text-xs py-1 border-b"
											>
												<span>
													{index + 1}. <strong>{rider.name}</strong> (
													{rider.activeTitle})
												</span>
												<span className="font-mono font-bold text-amber-600">
													{rider.xpPoints} XP
												</span>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					)}
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
