"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
	buses,
	conductorAccess,
	operators,
	tripReports,
	trips,
	users,
} from "@/lib/db/schema";
import { generateConductorCode } from "@/lib/services/qr";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── Grant Conductor Access ──────────────────────────────────────────────────

export async function grantConductorAccessAction(data: {
	conductorId: string;
	busId: string;
}) {
	const session = await auth();
	if (!session || !["operator", "admin"].includes(session.user.role)) {
		return { success: false, error: "Unauthorised" };
	}

	if (!data.conductorId?.trim() || !data.busId?.trim()) {
		return { success: false, error: "conductor_id and bus_id required" };
	}

	// Verify conductor exists and has conductor role
	const [conductor] = await db
		.select()
		.from(users)
		.where(and(eq(users.id, data.conductorId), eq(users.role, "conductor")));

	if (!conductor) {
		return {
			success: false,
			error: "Conductor not found or does not have conductor role",
		};
	}

	// Check for existing access
	const existing = await db
		.select()
		.from(conductorAccess)
		.where(
			and(
				eq(conductorAccess.conductorId, data.conductorId),
				eq(conductorAccess.busId, data.busId),
			),
		);

	if (existing.length) {
		if (existing[0].isActive) {
			return {
				success: false,
				error: "Conductor already has access to this bus",
			};
		}
		// Reactivate
		await db
			.update(conductorAccess)
			.set({ isActive: true, grantedAt: new Date() })
			.where(eq(conductorAccess.id, existing[0].id));

		return {
			success: true,
			data: { conductorCode: existing[0].conductorCode },
		};
	}

	const code = await generateConductorCode();

	const [access] = await db
		.insert(conductorAccess)
		.values({
			conductorId: data.conductorId,
			busId: data.busId,
			operatorId: session.user.id,
			conductorCode: code,
		})
		.returning();

	revalidatePath("/dashboard");
	return {
		success: true,
		data: {
			accessId: access.id,
			conductorCode: code,
			conductor: { name: conductor.name, email: conductor.email },
		},
	};
}

// ── Revoke Conductor Access ─────────────────────────────────────────────────

export async function revokeConductorAccessAction(data: {
	conductorId: string;
	busId: string;
}) {
	const session = await auth();
	if (!session || !["operator", "admin"].includes(session.user.role)) {
		return { success: false, error: "Unauthorised" };
	}

	await db
		.update(conductorAccess)
		.set({ isActive: false })
		.where(
			and(
				eq(conductorAccess.conductorId, data.conductorId),
				eq(conductorAccess.busId, data.busId),
				eq(conductorAccess.operatorId, session.user.id),
			),
		);

	revalidatePath("/dashboard");
	return { success: true, message: "Conductor access revoked" };
}

// ── Get All Conductors (no search required) ────────────────────────────────

export async function getAllConductorsAction() {
	const session = await auth();
	if (!session || !["operator", "admin"].includes(session.user.role)) {
		return { success: false, error: "Unauthorised" };
	}

	const results = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			phone: users.phone,
		})
		.from(users)
		.where(and(eq(users.role, "conductor"), eq(users.isActive, true)))
		.orderBy(users.name)
		.limit(100);

	return { success: true, data: results };
}

// ── Search Conductors ───────────────────────────────────────────────────────

export async function searchConductorsAction(query: string) {
	const session = await auth();
	if (!session || !["operator", "admin"].includes(session.user.role)) {
		return { success: false, error: "Unauthorised" };
	}

	const search = `%${query.trim()}%`;
	const results = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			phone: users.phone,
		})
		.from(users)
		.where(
			and(
				eq(users.role, "conductor"),
				eq(users.isActive, true),
				or(
					ilike(users.name, search),
					ilike(users.email, search),
					ilike(users.phone, search),
				),
			),
		)
		.limit(10);

	return { success: true, data: results };
}

// ── Get Operator's Conductor Assignments ────────────────────────────────────

export async function getOperatorConductorAssignmentsAction() {
	const session = await auth();
	if (!session || !["operator", "admin"].includes(session.user.role)) {
		return { success: false, error: "Unauthorised" };
	}

	// Get the operator record for this user
	const [operatorRow] = await db
		.select()
		.from(operators)
		.where(eq(operators.userId, session.user.id));

	if (!operatorRow) return { success: true, data: [] };

	// Get all conductor_access rows for buses owned by this operator
	const rows = await db
		.select({
			access: conductorAccess,
			bus: buses,
			conductor: {
				id: users.id,
				name: users.name,
				email: users.email,
				phone: users.phone,
			},
		})
		.from(conductorAccess)
		.innerJoin(buses, eq(conductorAccess.busId, buses.id))
		.innerJoin(users, eq(conductorAccess.conductorId, users.id))
		.where(
			and(
				eq(buses.operatorId, operatorRow.id),
				eq(conductorAccess.isActive, true),
			),
		)
		.orderBy(desc(conductorAccess.grantedAt));

	return {
		success: true,
		data: rows.map((r) => ({
			accessId: r.access.id,
			conductorCode: r.access.conductorCode,
			grantedAt: r.access.grantedAt,
			bus: {
				id: r.bus.id,
				number: r.bus.number,
				origin: r.bus.origin,
				destination: r.bus.destination,
			},
			conductor: r.conductor,
		})),
	};
}

// ── Get My Conductor Access (for conductor dashboard) ───────────────────────

export async function getMyConductorAccessAction() {
	const session = await auth();
	if (!session || session.user.role !== "conductor") {
		return { success: false, error: "Unauthorised" };
	}

	const access = await db
		.select({
			access: conductorAccess,
			bus: buses,
		})
		.from(conductorAccess)
		.innerJoin(buses, eq(conductorAccess.busId, buses.id))
		.where(
			and(
				eq(conductorAccess.conductorId, session.user.id),
				eq(conductorAccess.isActive, true),
			),
		);

	// Get recent trip reports for this conductor
	const reports = await db
		.select()
		.from(tripReports)
		.where(eq(tripReports.conductorId, session.user.id))
		.orderBy(desc(tripReports.createdAt))
		.limit(10);

	const totalEarnings = reports.reduce(
		(sum, r) => sum + Number.parseFloat(r.totalRevenueInr),
		0,
	);
	const totalPassengers = reports.reduce(
		(sum, r) => sum + r.totalPassengers,
		0,
	);

	return {
		success: true,
		data: {
			assignments: access.map((r) => ({
				bus: {
					id: r.bus.id,
					number: r.bus.number,
					origin: r.bus.origin,
					destination: r.bus.destination,
					fullFare: r.bus.fullFare,
					totalSeats: r.bus.totalSeats,
					occupiedSeats: r.bus.occupiedSeats,
					status: r.bus.status,
					driverName: r.bus.driverName,
					conductorName: r.bus.conductorName,
					isLive: r.bus.isLive,
				},
				conductorCode: r.access.conductorCode,
				grantedAt: r.access.grantedAt,
			})),
			recentReports: reports,
			summary: {
				totalTrips: reports.length,
				totalEarnings: totalEarnings.toFixed(2),
				totalPassengers,
			},
		},
	};
}

// ── Get Conductor Trips ──────────────────────────────────────────────────────

export async function getConductorTripsAction() {
	const session = await auth();
	if (!session || session.user.role !== "conductor") {
		return { success: false, error: "Unauthorised" };
	}

	const conductorTrips = await db
		.select({
			trip: trips,
			bus: buses,
		})
		.from(trips)
		.innerJoin(buses, eq(trips.busId, buses.id))
		.innerJoin(
			conductorAccess,
			and(
				eq(conductorAccess.busId, trips.busId),
				eq(conductorAccess.conductorId, session.user.id),
				eq(conductorAccess.isActive, true),
			),
		)
		.where(
			or(
				eq(trips.status, "scheduled"),
				and(eq(trips.status, "active"), eq(trips.conductorId, session.user.id)),
			),
		)
		.orderBy(desc(trips.departureDate))
		.limit(20);

	return {
		success: true,
		data: conductorTrips.map((r) => ({
			...r.trip,
			bus: r.bus,
		})),
	};
}
