"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
	AlertTriangle,
	ArrowRight,
	Check,
	Copy,
	Loader2,
	MessageSquare,
	Phone,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

export default function TripDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id: tripIdStr } = use(params);
	const tripId = Number.parseInt(tripIdStr);

	const searchParams = useSearchParams();
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const [trip, setTrip] = useState<any>(null);
	const [seatCount, setSeatCount] = useState(1);
	const [guestName, setGuestName] = useState("");
	const [guestPhone, setGuestPhone] = useState("");
	const [useDiscount, setUseDiscount] = useState(true);

	const [loading, setLoading] = useState(true);
	const [booking, setBooking] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const [ticketResult, setTicketResult] = useState<any>(null);
	const [upiTxnId, setUpiTxnId] = useState("");
	const [upiApp, setUpiApp] = useState("generic");

	// Offline payment states
	const [offlineMethod, setOfflineMethod] = useState<"ussd" | "sms" | null>(
		null,
	);
	const [copiedUpi, setCopiedUpi] = useState(false);
	const [copiedAmount, setCopiedAmount] = useState(false);
	const [copiedSms, setCopiedSms] = useState(false);

	useEffect(() => {
		async function fetchTripDetails() {
			try {
				setLoading(true);
				const response = await fetch("/api/trips/search");
				const resJson = await response.json();
				if (resJson.success && resJson.data) {
					const found = resJson.data.find((t: any) => t.id === tripId);
					setTrip(found);
				}
			} catch (err: any) {
				setError(`Failed to load trip details: ${err.message}`);
			} finally {
				setLoading(false);
			}
		}
		if (!Number.isNaN(tripId)) {
			fetchTripDetails();
		}
	}, [tripId]);

	const handleBook = async (e: React.FormEvent) => {
		e.preventDefault();
		setBooking(true);
		setError("");
		setSuccess("");
		try {
			const fromStopName = searchParams.get("from") || "";
			const toStopName = searchParams.get("to") || "";

			let fromStop = trip?.stops?.find((s: any) =>
				s.stopName.toLowerCase().includes(fromStopName.toLowerCase()),
			);
			let toStop = trip?.stops?.find((s: any) =>
				s.stopName.toLowerCase().includes(toStopName.toLowerCase()),
			);

			if (!fromStop || !toStop) {
				fromStop = trip?.stops?.[0];
				toStop = trip?.stops?.[trip?.stops?.length - 1];
			}

			if (!fromStop || !toStop) {
				throw new Error("Could not automatically determine route stops");
			}

			const response = await fetch("/api/tickets/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					trip_id: tripId,
					from_stop_id: fromStop.stopId || fromStop.id,
					to_stop_id: toStop.stopId || toStop.id,
					seat_count: seatCount,
					guest_name: guestName || undefined,
					guest_phone: guestPhone || undefined,
					use_discount: useDiscount,
				}),
			});
			const resJson = await response.json();
			if (resJson.success) {
				setTicketResult(resJson.data);
				setSuccess("Ticket created! Please complete payment below.");
				toast.success("Ticket created! Proceed to payment.");
			} else {
				setError(resJson.error || "Failed to book ticket");
				toast.error(resJson.error || "Failed to book ticket");
			}
		} catch (err: any) {
			setError(err.message || "An error occurred");
			toast.error(err.message || "An error occurred");
		} finally {
			setBooking(false);
		}
	};

	const handleConfirmPayment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!ticketResult) return;
		setError("");
		setSuccess("");

		startTransition(async () => {
			try {
				const response = await fetch("/api/tickets/confirm-payment", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						ticket_uid: ticketResult.ticket.ticketUid,
						upi_txn_id: upiTxnId,
						payment_method: offlineMethod || "upi",
						upi_app: upiApp,
					}),
				});
				const resJson = await response.json();
				if (resJson.success) {
					setSuccess("Payment confirmed! Your ticket is now active.");
					toast.success("Payment confirmed successfully!");
					setTicketResult(null);
					setUpiTxnId("");
					setTimeout(() => {
						router.push("/dashboard");
					}, 2000);
				} else {
					setError(resJson.error || "Failed to confirm payment");
					toast.error(resJson.error || "Failed to confirm payment");
				}
			} catch (err: any) {
				setError(err.message || "An error occurred");
				toast.error(err.message || "An error occurred");
			}
		});
	};

	const handleCopyText = (text: string, type: "upi" | "amount" | "sms") => {
		navigator.clipboard.writeText(text);
		if (type === "upi") {
			setCopiedUpi(true);
			setTimeout(() => setCopiedUpi(false), 2000);
		} else if (type === "amount") {
			setCopiedAmount(true);
			setTimeout(() => setCopiedAmount(false), 2000);
		} else if (type === "sms") {
			setCopiedSms(true);
			setTimeout(() => setCopiedSms(false), 2000);
		}
		toast.success("Copied to clipboard!");
	};

	if (loading) {
		return (
			<AppShell title="Trip Booking" subtitle="Loading details...">
				<div className="flex h-64 items-center justify-center">
					<div className="flex flex-col items-center gap-3">
						<Loader2 className="h-8 w-8 animate-spin" />
						<p className="text-sm font-bold uppercase tracking-widest">
							Loading Trip Details...
						</p>
					</div>
				</div>
			</AppShell>
		);
	}

	if (!trip) {
		return (
			<AppShell title="Trip Booking" subtitle="Trip not found">
				<div className="ticket-stub border-2 p-8 text-center neo-shadow">
					<AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
					<h2 className="text-xl font-bold uppercase">Trip Not Found</h2>
					<button
						onClick={() => router.push("/trips")}
						className="theme-btn-primary brutal-transition brutal-hover mt-4 inline-flex h-10 items-center border-2 px-5 text-xs font-bold uppercase tracking-wide neo-shadow"
					>
						Back to Search
					</button>
				</div>
			</AppShell>
		);
	}

	const youPayAmount = ticketResult?.fare_breakdown?.you_pay_inr || 0;
	const ownerUpiAddress = ticketResult?.owner_upi || "";
	const smsPayBody = `PAY ${ownerUpiAddress} ${youPayAmount} BusLink-${ticketResult?.ticket?.ticketUid}`;

	return (
		<AppShell title="Book Ticket" subtitle={`Trip #${trip.id} booking details`}>
			<div className="grid gap-6 md:grid-cols-3">
				{/* Left Columns: Bus Details & Forms */}
				<div className="space-y-6 md:col-span-2">
					{/* Bus Summary Card */}
					<div
						className="border-2 p-5 neo-shadow"
						style={{
							background: "var(--bg-surface)",
							borderColor: "var(--border-default)",
						}}
					>
						<span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide border">
							{trip.registration_number || "Active Bus"}
						</span>
						<h2
							className="text-3xl font-extrabold uppercase mt-2"
							style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
						>
							{trip.bus_name || trip.busId}
						</h2>
						<p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
							<strong>Route:</strong> {trip.start_city}{" "}
							<ArrowRight className="h-3 w-3" /> {trip.end_city}
						</p>

						<div
							className="grid grid-cols-2 gap-4 border-t-2 mt-4 pt-4 border-dashed"
							style={{ borderColor: "var(--border-default)" }}
						>
							<div>
								<p className="text-[10px] font-bold uppercase text-muted-foreground">
									Departure
								</p>
								<p className="text-sm font-bold">
									{trip.departureDate} at {trip.departureTime24}
								</p>
							</div>
							<div>
								<p className="text-[10px] font-bold uppercase text-muted-foreground">
									Available Seats
								</p>
								<p className="text-sm font-bold text-teal-600">
									{trip.available_seats} / {trip.total_seats}
								</p>
							</div>
						</div>
					</div>

					{/* Step Forms */}
					{!ticketResult ? (
						<div
							className="border-2 p-5 neo-shadow"
							style={{
								background: "var(--bg-surface)",
								borderColor: "var(--border-default)",
							}}
						>
							<h3 className="text-lg font-bold uppercase mb-4 tracking-wide border-b pb-2">
								1. Passenger Details
							</h3>
							<form onSubmit={handleBook} className="space-y-4">
								<div>
									<label className="block text-xs font-bold uppercase mb-1">
										Seats to Book (1-6)
									</label>
									<input
										type="number"
										min="1"
										max="6"
										value={seatCount}
										onChange={(e) => setSeatCount(Number(e.target.value))}
										required
										className="w-full border-2 p-2 font-mono text-sm"
										style={{
											background: "var(--input-bg)",
											color: "var(--input-text)",
										}}
									/>
								</div>

								<div className="border-t pt-4 space-y-3">
									<p className="text-xs font-bold uppercase text-muted-foreground">
										Guest Information (if booking without login)
									</p>
									<div className="grid gap-3 md:grid-cols-2">
										<input
											type="text"
											placeholder="Full Name"
											value={guestName}
											onChange={(e) => setGuestName(e.target.value)}
											className="w-full border-2 p-2 font-mono text-sm"
											style={{
												background: "var(--input-bg)",
												color: "var(--input-text)",
											}}
										/>
										<input
											type="text"
											placeholder="Phone Number"
											value={guestPhone}
											onChange={(e) => setGuestPhone(e.target.value)}
											className="w-full border-2 p-2 font-mono text-sm"
											style={{
												background: "var(--input-bg)",
												color: "var(--input-text)",
											}}
										/>
									</div>
								</div>

								<div className="flex items-center gap-2 border-t pt-3">
									<input
										type="checkbox"
										id="useDiscount"
										checked={useDiscount}
										onChange={(e) => setUseDiscount(e.target.checked)}
										className="h-4 w-4"
									/>
									<label
										htmlFor="useDiscount"
										className="text-xs font-bold uppercase cursor-pointer"
									>
										Apply Bus Pass / Student discount
									</label>
								</div>

								<button
									type="submit"
									disabled={booking}
									className="w-full border-2 p-2.5 font-bold uppercase text-sm neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none cursor-pointer"
									style={{
										background: "var(--cta-bg)",
										color: "var(--text-primary)",
									}}
								>
									{booking ? "BOOKING..." : "CONFIRM BOOKING"}
								</button>
							</form>
						</div>
					) : (
						<div
							className="border-2 p-5 neo-shadow space-y-5"
							style={{
								background: "var(--bg-surface)",
								borderColor: "var(--border-default)",
							}}
						>
							<h3 className="text-lg font-bold uppercase tracking-wide border-b pb-2">
								2. Payment Details
							</h3>

							{/* Fare breakdown details */}
							<div
								className="p-4 border-2 bg-yellow-50/50"
								style={{ borderColor: "var(--border-default)" }}
							>
								<div className="flex justify-between items-center text-sm font-semibold">
									<span>Ticket UID:</span>
									<span className="font-mono">
										{ticketResult.ticket.ticketUid}
									</span>
								</div>
								<div className="flex justify-between items-center text-xs mt-2">
									<span className="text-muted-foreground">Original Price:</span>
									<span>₹{ticketResult.fare_breakdown.original_inr}</span>
								</div>
								{ticketResult.fare_breakdown.discount_type && (
									<div className="flex justify-between items-center text-xs text-teal-600 font-semibold mt-1">
										<span>
											Discount ({ticketResult.fare_breakdown.discount_type}):
										</span>
										<span>-₹{ticketResult.fare_breakdown.discount_inr}</span>
									</div>
								)}
								<div className="flex justify-between items-center text-lg font-extrabold mt-3 border-t pt-2 border-dashed">
									<span>You Pay:</span>
									<span className="theme-text-teal">
										₹{ticketResult.fare_breakdown.you_pay_inr}
									</span>
								</div>
							</div>

							{/* Payment Method Switcher */}
							<div
								className="flex gap-2 border-b pb-3"
								style={{ borderColor: "var(--border-default)" }}
							>
								<button
									onClick={() => setOfflineMethod(null)}
									className={`px-3 py-1.5 border-2 text-xs font-bold uppercase tracking-wide brutal-transition brutal-hover cursor-pointer ${!offlineMethod ? "bg-black text-white" : "bg-white"}`}
								>
									Online UPI Links
								</button>
								<button
									onClick={() => setOfflineMethod("ussd")}
									className={`px-3 py-1.5 border-2 text-xs font-bold uppercase tracking-wide brutal-transition brutal-hover cursor-pointer ${offlineMethod === "ussd" ? "bg-black text-white" : "bg-white"}`}
								>
									USSD (*99#)
								</button>
								<button
									onClick={() => setOfflineMethod("sms")}
									className={`px-3 py-1.5 border-2 text-xs font-bold uppercase tracking-wide brutal-transition brutal-hover cursor-pointer ${offlineMethod === "sms" ? "bg-black text-white" : "bg-white"}`}
								>
									SMS Payment
								</button>
							</div>

							{/* Online UPI flow */}
							{!offlineMethod && ticketResult.upi_links && (
								<div className="space-y-3">
									<p className="text-xs font-bold uppercase text-muted-foreground">
										Choose app to open direct payment redirect link:
									</p>
									<div className="grid gap-2 grid-cols-3">
										<a
											href={ticketResult.upi_links.gpay}
											className="border-2 p-3 text-center text-xs font-bold uppercase bg-blue-50 hover:bg-blue-100 flex flex-col items-center justify-center gap-1.5 brutal-transition brutal-hover neo-shadow"
											onClick={() => setUpiApp("gpay")}
										>
											<span className="text-lg font-extrabold text-blue-600">
												GPay
											</span>
										</a>
										<a
											href={ticketResult.upi_links.phonepe}
											className="border-2 p-3 text-center text-xs font-bold uppercase bg-purple-50 hover:bg-purple-100 flex flex-col items-center justify-center gap-1.5 brutal-transition brutal-hover neo-shadow"
											onClick={() => setUpiApp("phonepe")}
										>
											<span className="text-lg font-extrabold text-purple-600">
												PhonePe
											</span>
										</a>
										<a
											href={ticketResult.upi_links.paytm}
											className="border-2 p-3 text-center text-xs font-bold uppercase bg-cyan-50 hover:bg-cyan-100 flex flex-col items-center justify-center gap-1.5 brutal-transition brutal-hover neo-shadow"
											onClick={() => setUpiApp("paytm")}
										>
											<span className="text-lg font-extrabold text-cyan-600">
												Paytm
											</span>
										</a>
									</div>
								</div>
							)}

							{/* USSD *99# Flow */}
							{offlineMethod === "ussd" && (
								<div className="space-y-4">
									<div className="p-4 border bg-gray-50 flex items-start gap-2.5">
										<Phone className="h-5 w-5 text-gray-700 shrink-0 mt-0.5" />
										<div className="text-xs space-y-1">
											<p className="font-bold">
												Offline USSD Payment Steps (*99#):
											</p>
											<ol className="list-decimal list-inside space-y-1 mt-1.5">
												<li>
													Dial{" "}
													<span className="font-mono font-bold bg-gray-200 px-1 py-0.5">
														*99#
													</span>{" "}
													from registered SIM
												</li>
												<li>
													Select{" "}
													<span className="font-bold">1 (Send Money)</span>
												</li>
												<li>
													Select{" "}
													<span className="font-bold">3 (UPI ID / VPA)</span>
												</li>
												<li>Enter operator UPI VPA below</li>
												<li>Enter Amount below</li>
												<li>
													Enter remarks:{" "}
													<span className="font-mono font-bold bg-gray-200 px-1 py-0.5">
														BusLink
													</span>
												</li>
											</ol>
										</div>
									</div>

									{/* VPA Copy field */}
									<div className="space-y-3.5">
										<div>
											<p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">
												Operator VPA / UPI ID
											</p>
											<div className="flex border-2 bg-white">
												<input
													type="text"
													readOnly
													value={ownerUpiAddress}
													className="flex-1 p-2 font-mono text-sm bg-transparent border-none outline-none"
												/>
												<button
													type="button"
													onClick={() => handleCopyText(ownerUpiAddress, "upi")}
													className="px-3 border-l-2 bg-gray-100 hover:bg-gray-200 brutal-transition flex items-center justify-center cursor-pointer"
												>
													{copiedUpi ? (
														<Check className="h-4 w-4 text-green-600" />
													) : (
														<Copy className="h-4 w-4" />
													)}
												</button>
											</div>
										</div>

										<div>
											<p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">
												Exact Amount
											</p>
											<div className="flex border-2 bg-white">
												<input
													type="text"
													readOnly
													value={`₹${youPayAmount}`}
													className="flex-1 p-2 font-mono text-sm bg-transparent border-none outline-none"
												/>
												<button
													type="button"
													onClick={() =>
														handleCopyText(String(youPayAmount), "amount")
													}
													className="px-3 border-l-2 bg-gray-100 hover:bg-gray-200 brutal-transition flex items-center justify-center cursor-pointer"
												>
													{copiedAmount ? (
														<Check className="h-4 w-4 text-green-600" />
													) : (
														<Copy className="h-4 w-4" />
													)}
												</button>
											</div>
										</div>
									</div>
								</div>
							)}

							{/* SMS Flow */}
							{offlineMethod === "sms" && (
								<div className="space-y-4">
									<div className="p-4 border bg-gray-50 flex items-start gap-2.5">
										<MessageSquare className="h-5 w-5 text-gray-700 shrink-0 mt-0.5" />
										<div className="text-xs space-y-1">
											<p className="font-bold">Offline SMS Banking Payment:</p>
											<p className="mt-1">
												You can send the payment payload message below to your
												bank's SMS banking gateway or open your SMS app
												directly.
											</p>
										</div>
									</div>

									{/* SMS payload */}
									<div>
										<p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">
											Pre-filled SMS Body
										</p>
										<div className="flex border-2 bg-white">
											<textarea
												readOnly
												rows={2}
												value={smsPayBody}
												className="flex-1 p-2 font-mono text-sm bg-transparent border-none outline-none resize-none"
											/>
											<button
												type="button"
												onClick={() => handleCopyText(smsPayBody, "sms")}
												className="px-3 border-l-2 bg-gray-100 hover:bg-gray-200 brutal-transition flex items-center justify-center cursor-pointer"
											>
												{copiedSms ? (
													<Check className="h-4 w-4 text-green-600" />
												) : (
													<Copy className="h-4 w-4" />
												)}
											</button>
										</div>
									</div>

									{/* Action buttons */}
									<div className="flex gap-2">
										<a
											href={`sms:?body=${encodeURIComponent(smsPayBody)}`}
											className="flex-1 border-2 p-2.5 text-center text-xs font-bold uppercase tracking-wide bg-yellow-50 hover:bg-yellow-100 brutal-transition brutal-hover text-black neo-shadow"
										>
											💬 Open Messages App
										</a>
									</div>
								</div>
							)}

							{/* Confirm payment step */}
							<form
								onSubmit={handleConfirmPayment}
								className="space-y-3.5 border-t pt-4"
								style={{ borderColor: "var(--border-default)" }}
							>
								<div>
									<label className="block text-xs font-bold uppercase mb-1">
										Enter UPI Transaction Reference ID (from app / SMS / USSD)
									</label>
									<input
										type="text"
										value={upiTxnId}
										onChange={(e) => setUpiTxnId(e.target.value)}
										placeholder="e.g. 123456789012"
										required
										className="w-full border-2 p-2 font-mono text-sm"
										style={{
											background: "var(--input-bg)",
											color: "var(--input-text)",
										}}
									/>
								</div>

								{/* App Dropdown */}
								{!offlineMethod && (
									<div>
										<label className="block text-xs font-bold uppercase mb-1">
											Select App Used
										</label>
										<select
											value={upiApp}
											onChange={(e) => setUpiApp(e.target.value)}
											className="w-full border-2 p-2 font-mono text-sm"
											style={{
												background: "var(--input-bg)",
												color: "var(--input-text)",
											}}
										>
											<option value="generic">Default UPI App</option>
											<option value="gpay">Google Pay</option>
											<option value="phonepe">PhonePe</option>
											<option value="paytm">Paytm</option>
										</select>
									</div>
								)}

								<button
									type="submit"
									disabled={isPending}
									className="w-full border-2 p-3 font-bold uppercase text-sm neo-shadow transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:neo-shadow-none cursor-pointer flex items-center justify-center gap-1.5"
									style={{
										background: "var(--status-running-border)",
										color: "white",
									}}
								>
									{isPending ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Verifying Payment...
										</>
									) : (
										"CONFIRM PAYMENT"
									)}
								</button>
							</form>
						</div>
					)}
				</div>

				{/* Right Column: Alerts & Help */}
				<div className="space-y-6">
					<div
						className="border-2 p-5 neo-shadow"
						style={{
							background: "var(--bg-surface-2)",
							borderColor: "var(--border-default)",
						}}
					>
						<h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
							🛡️ Security Note
						</h3>
						<p
							className="text-xs leading-relaxed"
							style={{ color: "var(--text-secondary)" }}
						>
							Keep your transaction IDs safe. Do not share confirmation
							screenshots with anyone except the conductor upon boarding.
						</p>
						<p
							className="text-xs leading-relaxed mt-2"
							style={{ color: "var(--text-secondary)" }}
						>
							If you are using USSD or SMS banking, please make sure you dial or
							send the message from the SIM card registered with your bank
							account.
						</p>
					</div>

					<div
						className="border-2 p-5 neo-shadow"
						style={{
							background: "var(--bg-surface-2)",
							borderColor: "var(--border-default)",
						}}
					>
						<h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
							💡 Offline Help
						</h3>
						<p
							className="text-xs leading-relaxed"
							style={{ color: "var(--text-secondary)" }}
						>
							No mobile internet? No problem! Toggle to the **USSD** or **SMS**
							tab.
						</p>
						<p
							className="text-xs leading-relaxed mt-2"
							style={{ color: "var(--text-secondary)" }}
						>
							These modes let you query your bank account directly over cellular
							network channels. Copy the VPA or text payload and dial *99# to
							finalize payment offline!
						</p>
					</div>
				</div>
			</div>
		</AppShell>
	);
}
