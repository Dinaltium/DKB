"use client";

import { getNotificationsAction } from "@/lib/actions/notifications";
import {
	activateTripAction,
	advanceStopAction,
	endTripAction,
} from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { useEffect, useState } from "react";

interface TripStop {
	id: number;
	stopName: string;
	stopOrder: number;
	arrivalTime12: string;
	arrivalPeriod: string;
}

interface Trip {
	id: number;
	busId: string;
	routeId: number | null;
	departureDate: string;
	departureTime24: string;
	status: string;
	currentStopIdx: number;
	isLive: boolean;
	stops?: TripStop[];
}

export default function ConductorDashboard() {
	const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
	const [scheduledTrips, setScheduledTrips] = useState<Trip[]>([]);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [report, setReport] = useState<any>(null);

	// Fetch data on mount
	useEffect(() => {
		async function fetchTrips() {
			try {
				setLoading(true);
				// Call API to fetch conductor trips
				const response = await fetch("/api/trips/search");
				const resJson = await response.json();
				if (resJson.success && resJson.data) {
					// Filter active trip (started by this conductor or status is active)
					const active = resJson.data.find((t: any) => t.status === "active");
					const scheduled = resJson.data.filter(
						(t: any) => t.status === "scheduled",
					);
					if (active) setActiveTrip(active);
					setScheduledTrips(scheduled);
				}
			} catch (err: any) {
				setError(`Failed to fetch trips data: ${err.message}`);
			} finally {
				setLoading(false);
			}
		}

		fetchTrips();
	}, []);

	const handleActivate = async (tripId: number) => {
		setMessage("");
		setError("");
		try {
			const res = await activateTripAction(tripId);
			if (res.success && res.data) {
				setMessage("Trip activated successfully!");
				// Reload trip details or set state
				window.location.reload();
			} else {
				setError(res.error || "Failed to activate trip");
			}
		} catch (err: any) {
			setError(err.message || "An error occurred");
		}
	};

	const handleAdvanceStop = async () => {
		if (!activeTrip) return;
		setMessage("");
		setError("");
		try {
			const res = await advanceStopAction(activeTrip.id);
			if (res.success && res.data) {
				setMessage(`Advanced to stop: ${res.data.currentStop}`);
				setActiveTrip((prev) => {
					if (!prev) return null;
					return {
						...prev,
						currentStopIdx: res.data!.currentStopIdx,
					};
				});
			} else {
				setError(res.error || "Failed to advance stop");
			}
		} catch (err: any) {
			setError(err.message || "An error occurred");
		}
	};

	const handleEndTrip = async () => {
		if (!activeTrip) return;
		if (
			!confirm(
				"Are you sure you want to end this trip? This will generate a trip report.",
			)
		)
			return;
		setMessage("");
		setError("");
		try {
			const res = await endTripAction(activeTrip.id);
			if (res.success && res.data) {
				setMessage("Trip ended successfully!");
				setReport(res.data);
				setActiveTrip(null);
			} else {
				setError(res.error || "Failed to end trip");
			}
		} catch (err: any) {
			setError(err.message || "An error occurred");
		}
	};

	if (loading) {
		return (
			<div style={{ padding: "20px", fontFamily: "sans-serif" }}>
				<h2>Loading Conductor Dashboard...</h2>
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
				CONDUCTOR DASHBOARD
			</h1>

			{message && (
				<div
					style={{
						color: "green",
						background: "#e2f0d9",
						padding: "10px",
						margin: "10px 0",
					}}
				>
					[SUCCESS] {message}
				</div>
			)}
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

			{/* Active Trip Info */}
			{activeTrip ? (
				<div
					style={{
						border: "2px solid #0056b3",
						padding: "15px",
						margin: "20px 0",
						background: "#e8f4fd",
					}}
				>
					<h2 style={{ margin: "0 0 10px 0", color: "#0056b3" }}>
						ACTIVE TRIP IN PROGRESS
					</h2>
					<p>
						<strong>Trip ID:</strong> {activeTrip.id}
					</p>
					<p>
						<strong>Bus:</strong> {activeTrip.busId}
					</p>
					<p>
						<strong>Current Stop Index:</strong> {activeTrip.currentStopIdx}
					</p>

					{activeTrip.stops && activeTrip.stops.length > 0 && (
						<div>
							<h3>Stops List:</h3>
							<ol>
								{activeTrip.stops.map((stop, idx) => (
									<li
										key={stop.id}
										style={{
											fontWeight:
												idx === activeTrip.currentStopIdx ? "bold" : "normal",
											color:
												idx === activeTrip.currentStopIdx ? "blue" : "#333",
											textDecoration:
												idx < activeTrip.currentStopIdx
													? "line-through"
													: "none",
										}}
									>
										{stop.stopName} ({stop.arrivalTime12} {stop.arrivalPeriod})
										{idx === activeTrip.currentStopIdx &&
											"  <-- CURRENT POSITION"}
									</li>
								))}
							</ol>
						</div>
					)}

					<div style={{ marginTop: "20px" }}>
						<button
							onClick={handleAdvanceStop}
							style={{
								padding: "10px 15px",
								background: "#007bff",
								color: "white",
								border: "none",
								cursor: "pointer",
								marginRight: "10px",
								fontSize: "14px",
							}}
						>
							Advance Stop (Next Stop)
						</button>
						<button
							onClick={handleEndTrip}
							style={{
								padding: "10px 15px",
								background: "#dc3545",
								color: "white",
								border: "none",
								cursor: "pointer",
								fontSize: "14px",
							}}
						>
							End Trip
						</button>
					</div>
				</div>
			) : (
				<div
					style={{
						padding: "15px",
						border: "1px solid #ccc",
						background: "#fff",
						margin: "20px 0",
					}}
				>
					<h3>No Active Trip</h3>
					<p>
						Select a trip from scheduled trips below to activate and start
						tracking.
					</p>
				</div>
			)}

			{/* Trip Report Summary */}
			{report && (
				<div
					style={{
						border: "2px dashed green",
						padding: "15px",
						background: "#e2f0d9",
						margin: "20px 0",
					}}
				>
					<h3 style={{ margin: "0 0 10px 0", color: "green" }}>
						TRIP COMPLETED REPORT
					</h3>
					<p>
						<strong>Total Passengers:</strong> {report.totalPassengers}
					</p>
					<p>
						<strong>Digital Tickets:</strong> {report.digitalTickets}
					</p>
					<p>
						<strong>Cash Tickets:</strong> {report.cashTickets}
					</p>
					<p>
						<strong>Total Revenue:</strong> ₹{report.totalRevenueInr}
					</p>
					<button
						onClick={() => setReport(null)}
						style={{ padding: "5px 10px" }}
					>
						Dismiss
					</button>
				</div>
			)}

			{/* Scheduled Trips */}
			<div style={{ marginTop: "30px" }}>
				<h2>SCHEDULED TRIPS</h2>
				{scheduledTrips.length === 0 ? (
					<p>No scheduled trips found.</p>
				) : (
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr style={{ background: "#eee", textAlign: "left" }}>
								<th style={{ padding: "10px", border: "1px solid #ddd" }}>
									Trip ID
								</th>
								<th style={{ padding: "10px", border: "1px solid #ddd" }}>
									Bus
								</th>
								<th style={{ padding: "10px", border: "1px solid #ddd" }}>
									Departure
								</th>
								<th style={{ padding: "10px", border: "1px solid #ddd" }}>
									Action
								</th>
							</tr>
						</thead>
						<tbody>
							{scheduledTrips.map((t) => (
								<tr key={t.id}>
									<td style={{ padding: "10px", border: "1px solid #ddd" }}>
										{t.id}
									</td>
									<td style={{ padding: "10px", border: "1px solid #ddd" }}>
										{t.busId}
									</td>
									<td style={{ padding: "10px", border: "1px solid #ddd" }}>
										{t.departureDate} {t.departureTime24}
									</td>
									<td style={{ padding: "10px", border: "1px solid #ddd" }}>
										<button
											onClick={() => handleActivate(t.id)}
											style={{
												padding: "5px 10px",
												background: "#28a745",
												color: "white",
												border: "none",
												cursor: "pointer",
											}}
										>
											Start / Activate
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
