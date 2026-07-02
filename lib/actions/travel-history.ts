"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buses, stops, travelHistory } from "@/lib/db/schema";
import { distanceBetween } from "@/lib/services/location";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function saveTravelHistoryAction(data: {
	busNumber: string;
	fromStop: string;
	toStop: string;
	scannedFare: number;
	travelDate: string;
	ticketImageUrl?: string;
	rawOcrText?: string;
}) {
	const session = await auth();
	if (!session) {
		return { success: false, error: "Not authenticated" };
	}
	const userId = session.user.id;

	try {
		const [bus] = await db
			.select()
			.from(buses)
			.where(
				sql`LOWER(${buses.licensePlate}) = LOWER(${data.busNumber}) OR LOWER(${buses.number}) = LOWER(${data.busNumber}) OR LOWER(${buses.id}) = LOWER(${data.busNumber})`,
			)
			.limit(1);

		const [fromStopRes] = await db
			.select()
			.from(stops)
			.where(sql`LOWER(${stops.name}) LIKE LOWER(${`%${data.fromStop}%`})`)
			.limit(1);

		const [toStopRes] = await db
			.select()
			.from(stops)
			.where(sql`LOWER(${stops.name}) LIKE LOWER(${`%${data.toStop}%`})`)
			.limit(1);

		let distanceKm = 10;
		if (fromStopRes && toStopRes) {
			distanceKm = distanceBetween(
				fromStopRes.lat,
				fromStopRes.lng,
				toStopRes.lat,
				toStopRes.lng,
			);
		}

		// Expected fare calculation: ₹2.5 per km, minimum ₹10
		const expectedFare = Math.max(10, Math.round(distanceKm * 2.5));
		const overchargeDelta = Math.max(0, data.scannedFare - expectedFare);

		const [historyEntry] = await db
			.insert(travelHistory)
			.values({
				userId,
				busId: bus?.id || null,
				busNumber: bus?.licensePlate || data.busNumber,
				fromStop: fromStopRes?.name || data.fromStop,
				toStop: toStopRes?.name || data.toStop,
				scannedFare: data.scannedFare,
				expectedFare,
				overchargeDelta,
				ticketImageUrl: data.ticketImageUrl || null,
				rawOcrText: data.rawOcrText || null,
				travelDate: new Date(data.travelDate),
			})
			.returning();

		revalidatePath("/dashboard");
		return { success: true, data: historyEntry };
	} catch (err) {
		console.error("[saveTravelHistoryAction]", err);
		return {
			success: false,
			error: "Failed to log travel history",
		};
	}
}
