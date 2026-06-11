"use client";

import {
	confirmPaymentAction,
	createTicketAction,
} from "@/lib/actions/tickets";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";

export default function TripDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id: tripIdStr } = use(params);
	const tripId = Number.parseInt(tripIdStr);

	const searchParams = useSearchParams();
	const router = useRouter();

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
			// Find fromStopId and toStopId from route stops
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

			// Post to ticket API
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
				setSuccess(
					"Ticket created successfully! Please complete payment below.",
				);
			} else {
				setError(resJson.error || "Failed to book ticket");
			}
		} catch (err: any) {
			setError(err.message || "An error occurred");
		} finally {
			setBooking(false);
		}
	};

	const handleConfirmPayment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!ticketResult) return;
		setError("");
		setSuccess("");
		try {
			const response = await fetch("/api/tickets/confirm-payment", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					ticket_uid: ticketResult.ticket.ticketUid,
					upi_txn_id: upiTxnId,
					payment_method: "upi",
					upi_app: upiApp,
				}),
			});
			const resJson = await response.json();
			if (resJson.success) {
				setSuccess("Payment confirmed! Your ticket is now valid.");
				setTicketResult(null);
				setUpiTxnId("");
				setTimeout(() => {
					router.push("/dashboard");
				}, 2000);
			} else {
				setError(resJson.error || "Failed to confirm payment");
			}
		} catch (err: any) {
			setError(err.message || "An error occurred");
		}
	};

	if (loading) {
		return (
			<div style={{ padding: "20px", fontFamily: "sans-serif" }}>
				<h2>Loading Trip Details...</h2>
			</div>
		);
	}

	if (!trip) {
		return (
			<div style={{ padding: "20px", fontFamily: "sans-serif" }}>
				<h2>Trip Not Found</h2>
				<button onClick={() => router.push("/trips")}>Back to Search</button>
			</div>
		);
	}

	return (
		<div
			style={{
				padding: "20px",
				fontFamily: "monospace",
				maxWidth: "800px",
				margin: "0 auto",
				border: "1px solid #ccc",
				background: "#f9f9f9",
			}}
		>
			<h1 style={{ borderBottom: "2px solid #333", paddingBottom: "10px" }}>
				TRIP BOOKING
			</h1>

			<div
				style={{
					background: "#fff",
					padding: "15px",
					border: "2px solid #333",
					margin: "20px 0",
				}}
			>
				<h2>
					{trip.bus_name || trip.busId} ({trip.registration_number})
				</h2>
				<p>
					<strong>Route:</strong>{" "}
					{trip.route_name || `${trip.start_city} - ${trip.end_city}`}
				</p>
				<p>
					<strong>Departure:</strong> {trip.departureDate} at{" "}
					{trip.departureTime24}
				</p>
				<p>
					<strong>Available Seats:</strong> {trip.available_seats} /{" "}
					{trip.total_seats}
				</p>
			</div>

			{error && (
				<div
					style={{
						color: "red",
						background: "#fce4d6",
						padding: "10px",
						margin: "10px 0",
					}}
				>
					[ERROR] {error}
				</div>
			)}
			{success && (
				<div
					style={{
						color: "green",
						background: "#e2f0d9",
						padding: "10px",
						margin: "10px 0",
					}}
				>
					[SUCCESS] {success}
				</div>
			)}

			{!ticketResult ? (
				<form
					onSubmit={handleBook}
					style={{ display: "flex", flexDirection: "column", gap: "10px" }}
				>
					<div>
						<label style={{ fontWeight: "bold" }}>Seats to Book (1-6):</label>
						<br />
						<input
							type="number"
							min="1"
							max="6"
							value={seatCount}
							onChange={(e) => setSeatCount(Number(e.target.value))}
							required
							style={{
								width: "100%",
								padding: "8px",
								border: "2px solid #333",
							}}
						/>
					</div>

					<div style={{ padding: "10px 0" }}>
						<p style={{ fontWeight: "bold", margin: "0 0 5px 0" }}>
							Guest Information (if booking without login):
						</p>
						<input
							type="text"
							placeholder="Guest Name"
							value={guestName}
							onChange={(e) => setGuestName(e.target.value)}
							style={{
								width: "100%",
								padding: "8px",
								border: "2px solid #333",
								marginBottom: "8px",
							}}
						/>
						<input
							type="text"
							placeholder="Guest Phone Number"
							value={guestPhone}
							onChange={(e) => setGuestPhone(e.target.value)}
							style={{
								width: "100%",
								padding: "8px",
								border: "2px solid #333",
							}}
						/>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<input
							type="checkbox"
							id="useDiscount"
							checked={useDiscount}
							onChange={(e) => setUseDiscount(e.target.checked)}
						/>
						<label htmlFor="useDiscount" style={{ fontWeight: "bold" }}>
							Apply Pass/Student Discount if Available
						</label>
					</div>

					<button
						type="submit"
						disabled={booking}
						style={{
							padding: "10px 15px",
							background: "#007bff",
							color: "white",
							border: "none",
							cursor: "pointer",
							fontWeight: "bold",
						}}
					>
						{booking ? "BOOKING..." : "CONFIRM BOOKING"}
					</button>
				</form>
			) : (
				<div
					style={{
						border: "2px solid green",
						padding: "15px",
						background: "#f3faf1",
						margin: "20px 0",
					}}
				>
					<h3>PAYMENT STEPS</h3>
					<p>
						<strong>Ticket UID:</strong> {ticketResult.ticket.ticketUid}
					</p>
					<p>
						<strong>Original Price:</strong> ₹
						{ticketResult.fare_breakdown.original_inr}
					</p>
					{ticketResult.fare_breakdown.discount_type && (
						<p style={{ color: "green" }}>
							<strong>
								Pass Discount ({ticketResult.fare_breakdown.discount_type}):
							</strong>{" "}
							-₹{ticketResult.fare_breakdown.discount_inr}
						</p>
					)}
					<p style={{ fontSize: "18px", fontWeight: "bold" }}>
						<strong>Final Amount to Pay:</strong> ₹
						{ticketResult.fare_breakdown.you_pay_inr}
					</p>

					{ticketResult.upi_links && (
						<div
							style={{
								margin: "15px 0",
								padding: "10px",
								border: "1px solid #ccc",
								background: "#fff",
							}}
						>
							<p style={{ fontWeight: "bold" }}>
								UPI Deep Links (Open in app):
							</p>
							<ul
								style={{
									listStyle: "none",
									padding: 0,
									display: "flex",
									gap: "10px",
									flexWrap: "wrap",
								}}
							>
								<li>
									<a
										href={ticketResult.upi_links.gpay}
										style={{
											padding: "5px 10px",
											background: "#4285F4",
											color: "white",
											textDecoration: "none",
											fontSize: "12px",
										}}
									>
										Google Pay
									</a>
								</li>
								<li>
									<a
										href={ticketResult.upi_links.phonepe}
										style={{
											padding: "5px 10px",
											background: "#5f259f",
											color: "white",
											textDecoration: "none",
											fontSize: "12px",
										}}
									>
										PhonePe
									</a>
								</li>
								<li>
									<a
										href={ticketResult.upi_links.paytm}
										style={{
											padding: "5px 10px",
											background: "#00b9f5",
											color: "white",
											textDecoration: "none",
											fontSize: "12px",
										}}
									>
										Paytm
									</a>
								</li>
							</ul>
						</div>
					)}

					<form
						onSubmit={handleConfirmPayment}
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "10px",
							marginTop: "15px",
						}}
					>
						<div>
							<label style={{ fontWeight: "bold" }}>
								Enter UPI Transaction ID / Reference (Mock):
							</label>
							<br />
							<input
								type="text"
								value={upiTxnId}
								onChange={(e) => setUpiTxnId(e.target.value)}
								placeholder="e.g. 123456789012"
								required
								style={{
									width: "100%",
									padding: "8px",
									border: "2px solid #333",
								}}
							/>
						</div>
						<div>
							<label style={{ fontWeight: "bold" }}>UPI App used:</label>
							<br />
							<select
								value={upiApp}
								onChange={(e) => setUpiApp(e.target.value)}
								style={{
									width: "100%",
									padding: "8px",
									border: "2px solid #333",
								}}
							>
								<option value="generic">Default UPI</option>
								<option value="gpay">Google Pay</option>
								<option value="phonepe">PhonePe</option>
								<option value="paytm">Paytm</option>
							</select>
						</div>
						<button
							type="submit"
							style={{
								padding: "10px 15px",
								background: "#28a745",
								color: "white",
								border: "none",
								cursor: "pointer",
								fontWeight: "bold",
							}}
						>
							CONFIRM PAYMENT
						</button>
					</form>
				</div>
			)}
		</div>
	);
}
