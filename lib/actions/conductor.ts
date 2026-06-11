"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buses, conductorAccess, users } from "@/lib/db/schema";
import { generateConductorCode } from "@/lib/services/qr";
import { and, eq, ilike, or } from "drizzle-orm";
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

	return {
		success: true,
		data: access.map((r) => ({
			bus: {
				id: r.bus.id,
				number: r.bus.number,
				origin: r.bus.origin,
				destination: r.bus.destination,
			},
			conductorCode: r.access.conductorCode,
			grantedAt: r.access.grantedAt,
		})),
	};
}
