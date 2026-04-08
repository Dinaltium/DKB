"use client";

import { useState } from "react";
import { ModalFrame } from "@/components/modals/ModalFrame";
import { StopBuilder } from "@/components/shared/StopBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Stop } from "@/lib/db/schema";

export type BusRequestFormData = {
	number: string;
	licensePlate: string;
	origin: string;
	destination: string;
	fullFare: number;
	driverName: string;
	conductorName: string;
	totalSeats: number;
	schedule: string[];
	womenReservedTotal: number;
	studentCardAccepted: boolean;
	studentDiscountPercent: number;
	routeStopIds: string[];
	operatorAadhaar?: string;
	operatorLicense?: string;
	rcNumber?: string;
	pollutionCertNumber?: string;
	insurancePolicyNumber?: string;
};

export function BusRequestModal({
	stops,
	onClose,
	onSubmit,
	isPending,
}: {
	stops: Stop[];
	onClose: () => void;
	onSubmit: (data: BusRequestFormData) => void;
	isPending: boolean;
}) {
	const [number, setNumber] = useState("");
	const [licensePlate, setLicensePlate] = useState("");
	const [origin, setOrigin] = useState("");
	const [destination, setDestination] = useState("");
	const [fullFare, setFullFare] = useState("");
	const [driverName, setDriverName] = useState("");
	const [conductorName, setConductorName] = useState("");
	const [totalSeats, setTotalSeats] = useState("");
	const [scheduleRaw, setScheduleRaw] = useState("");
	const [routeStopIds, setRouteStopIds] = useState<string[]>([]);

	return (
		<ModalFrame title="Request bus registration" onClose={onClose}>
			<form
				className="grid gap-2 md:grid-cols-2"
				onSubmit={(e) => {
					e.preventDefault();
					onSubmit({
						number,
						licensePlate,
						origin,
						destination,
						fullFare: Number(fullFare),
						driverName,
						conductorName,
						totalSeats: Number(totalSeats),
						schedule: scheduleRaw
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean),
						womenReservedTotal: 0,
						studentCardAccepted: false,
						studentDiscountPercent: 0,
						routeStopIds,
					});
				}}
			>
				<Input
					required
					value={number}
					onChange={(e) => setNumber(e.target.value)}
					placeholder="Bus Number"
					className="rounded-none border-2 border-foreground"
				/>
				<Input
					required
					value={licensePlate}
					onChange={(e) => setLicensePlate(e.target.value)}
					placeholder="License Plate"
					className="rounded-none border-2 border-foreground"
				/>
				<Input
					required
					value={origin}
					onChange={(e) => setOrigin(e.target.value)}
					placeholder="Origin"
					className="rounded-none border-2 border-foreground"
				/>
				<Input
					required
					value={destination}
					onChange={(e) => setDestination(e.target.value)}
					placeholder="Destination"
					className="rounded-none border-2 border-foreground"
				/>
				<Input
					required
					type="number"
					value={fullFare}
					onChange={(e) => setFullFare(e.target.value)}
					placeholder="Full Fare"
					className="rounded-none border-2 border-foreground"
				/>
				<Input
					required
					type="number"
					value={totalSeats}
					onChange={(e) => setTotalSeats(e.target.value)}
					placeholder="Total Seats"
					className="rounded-none border-2 border-foreground"
				/>
				<Input
					required
					value={driverName}
					onChange={(e) => setDriverName(e.target.value)}
					placeholder="Driver Name"
					className="rounded-none border-2 border-foreground"
				/>
				<Input
					required
					value={conductorName}
					onChange={(e) => setConductorName(e.target.value)}
					placeholder="Conductor Name"
					className="rounded-none border-2 border-foreground"
				/>
				<Input
					value={scheduleRaw}
					onChange={(e) => setScheduleRaw(e.target.value)}
					placeholder="Schedule (comma separated)"
					className="md:col-span-2 rounded-none border-2 border-foreground"
				/>
				<div className="md:col-span-2">
					<StopBuilder
						stops={stops}
						value={routeStopIds}
						onChange={setRouteStopIds}
					/>
				</div>
				<div className="flex justify-end gap-2 md:col-span-2">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						className="rounded-none border-2 border-foreground font-bold uppercase shadow-[2px_2px_0_hsl(var(--foreground))]"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={isPending}
						className="rounded-none border-2 border-foreground font-bold uppercase shadow-[3px_3px_0_hsl(var(--foreground))]"
					>
						Submit request
					</Button>
				</div>
			</form>
		</ModalFrame>
	);
}
