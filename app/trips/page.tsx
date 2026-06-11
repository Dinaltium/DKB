"use client";

import { searchTripsAction } from "@/lib/actions/trips";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function TripSearchPage() {
	const [trips, setTrips] = useState<any[]>([]);
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [lat, setLat] = useState("");
	const [lng, setLng] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");
		try {
			let url = `/api/trips/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
			if (lat && lng) {
				url += `&lat=${lat}&lng=${lng}`;
			}
			const response = await fetch(url);
			const resJson = await response.json();
			if (resJson.success) {
				setTrips(resJson.data || []);
			} else {
				setError(resJson.error || "Failed to search trips");
			}
		} catch (err: any) {
			setError(err.message || "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	const useMyLocation = () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					setLat(position.coords.latitude.toString());
					setLng(position.coords.longitude.toString());
				},
				(err) => {
					setError(`Failed to get geolocation: ${err.message}`);
				},
			);
		} else {
			setError("Geolocation is not supported by your browser");
		}
	};

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
				BUS TRIP SEARCH
			</h1>

			<form
				onSubmit={handleSearch}
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "10px",
					margin: "20px 0",
				}}
			>
				<div>
					<label style={{ fontWeight: "bold" }}>From (Origin Stop):</label>
					<br />
					<input
						type="text"
						value={from}
						onChange={(e) => setFrom(e.target.value)}
						placeholder="e.g. Mangalore"
						required
						style={{ width: "100%", padding: "8px", border: "2px solid #333" }}
					/>
				</div>

				<div>
					<label style={{ fontWeight: "bold" }}>To (Destination Stop):</label>
					<br />
					<input
						type="text"
						value={to}
						onChange={(e) => setTo(e.target.value)}
						placeholder="e.g. Udupi"
						required
						style={{ width: "100%", padding: "8px", border: "2px solid #333" }}
					/>
				</div>

				<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
					<button
						type="button"
						onClick={useMyLocation}
						style={{
							padding: "8px 12px",
							background: "#6c757d",
							color: "white",
							border: "none",
							cursor: "pointer",
						}}
					>
						Use Current Location
					</button>
					{lat && lng && (
						<span style={{ fontSize: "12px", color: "green" }}>
							GPS: {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
						</span>
					)}
				</div>

				<button
					type="submit"
					disabled={loading}
					style={{
						padding: "10px 15px",
						background: "#333",
						color: "white",
						border: "none",
						cursor: "pointer",
						fontWeight: "bold",
					}}
				>
					{loading ? "SEARCHING..." : "SEARCH TRIPS"}
				</button>
			</form>

			{error && (
				<div
					style={{
						color: "red",
						background: "#fce4d6",
						padding: "10px",
						margin: "10px 0",
					}}
				>
					{error}
				</div>
			)}

			<div style={{ marginTop: "30px" }}>
				<h2>RESULTS</h2>
				{loading ? (
					<p>Loading trips...</p>
				) : trips.length === 0 ? (
					<p>No trips found matching criteria.</p>
				) : (
					<div
						style={{ display: "flex", flexDirection: "column", gap: "15px" }}
					>
						{trips.map((t) => (
							<div
								key={t.id}
								style={{
									border: "2px solid #333",
									padding: "15px",
									background: "#fff",
									boxShadow: "4px 4px 0 #333",
								}}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "between",
										alignItems: "center",
									}}
								>
									<h3 style={{ margin: 0 }}>
										Bus: {t.bus_name || t.busId} ({t.registration_number})
									</h3>
									<span
										style={{
											background: t.is_live ? "red" : "#6c757d",
											color: "white",
											padding: "2px 6px",
											fontSize: "10px",
											fontWeight: "bold",
										}}
									>
										{t.is_live ? "LIVE" : "SCHEDULED"}
									</span>
								</div>
								<p style={{ margin: "5px 0" }}>
									<strong>Route:</strong>{" "}
									{t.route_name || `${t.start_city} - ${t.end_city}`}
								</p>
								<p style={{ margin: "5px 0" }}>
									<strong>Departure:</strong> {t.departureDate} at{" "}
									{t.departureTime24}
								</p>
								<p style={{ margin: "5px 0" }}>
									<strong>Available Seats:</strong> {t.available_seats} /{" "}
									{t.total_seats}
								</p>
								{t.fare_inr && (
									<p
										style={{
											margin: "5px 0",
											color: "green",
											fontWeight: "bold",
										}}
									>
										Fare: ₹{t.fare_inr}
									</p>
								)}

								<div style={{ marginTop: "10px" }}>
									<Link
										href={`/trips/${t.id}?from=${from}&to=${to}`}
										style={{
											padding: "5px 10px",
											background: "#007bff",
											color: "white",
											textDecoration: "none",
											fontWeight: "bold",
										}}
									>
										BOOK TICKET
									</Link>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
