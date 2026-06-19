"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { fares, routeStops, routes } from "@/lib/db/schema";
import { getCoordinates } from "@/lib/services/location";
import { asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Normalises the shape db.execute(raw sql) returns across drivers.
// postgres-js (current): returns a RowList that is itself an array of rows.
// neon-http (legacy):    returns { rows, rowCount, ... }.
// Most call sites just need the array, so unwrap once here.
function rowsOf<T>(result: unknown): T[] {
	if (Array.isArray(result)) return result as T[];
	const withRows = result as { rows?: T[] } | null | undefined;
	return withRows?.rows ?? [];
}

// ── Route CRUD Actions ───────────────────────────────────────────────────────

export async function createRouteAction(data: {
	routeName: string;
	startCity: string;
	endCity: string;
}) {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	if (
		!data.routeName?.trim() ||
		!data.startCity?.trim() ||
		!data.endCity?.trim()
	) {
		return {
			success: false,
			error: "Route name, start city and end city are required",
		};
	}

	const [newRoute] = await db
		.insert(routes)
		.values({
			routeName: data.routeName.trim(),
			startCity: data.startCity.trim(),
			endCity: data.endCity.trim(),
			createdBy: session.user.id,
		})
		.returning();

	revalidatePath("/dashboard");
	return { success: true, data: newRoute };
}

export async function getRoutesAction() {
	const result = await db
		.select()
		.from(routes)
		.where(eq(routes.isActive, true))
		.orderBy(routes.routeName);

	// Fetch stop count for each route
	const routesWithStopCount = await Promise.all(
		result.map(async (r) => {
			const [countRes] = await db
				.select({ count: sql<number>`count(*)` })
				.from(routeStops)
				.where(eq(routeStops.routeId, r.id));

			return {
				...r,
				stop_count: Number(countRes?.count || 0),
			};
		}),
	);

	return { success: true, data: routesWithStopCount };
}

export async function getRouteByIdAction(id: number) {
	const [route] = await db.select().from(routes).where(eq(routes.id, id));

	if (!route) {
		return { success: false, error: "Route not found" };
	}

	// Fetch stops
	const stops = await db
		.select()
		.from(routeStops)
		.where(eq(routeStops.routeId, id))
		.orderBy(asc(routeStops.stopOrder));

	return { success: true, data: { ...route, stops } };
}

export async function updateRouteAction(
	id: number,
	data: {
		routeName?: string;
		startCity?: string;
		endCity?: string;
		isActive?: boolean;
	},
) {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	const updateFields: Partial<typeof routes.$inferInsert> = {};
	if (data.routeName?.trim()) updateFields.routeName = data.routeName.trim();
	if (data.startCity?.trim()) updateFields.startCity = data.startCity.trim();
	if (data.endCity?.trim()) updateFields.endCity = data.endCity.trim();
	if (data.isActive !== undefined) updateFields.isActive = data.isActive;

	const [updatedRoute] = await db
		.update(routes)
		.set(updateFields)
		.where(eq(routes.id, id))
		.returning();

	if (!updatedRoute) {
		return { success: false, error: "Route not found" };
	}

	revalidatePath("/dashboard");
	return { success: true, data: updatedRoute };
}

export async function deleteRouteAction(id: number) {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	await db.update(routes).set({ isActive: false }).where(eq(routes.id, id));

	revalidatePath("/dashboard");
	return { success: true, message: "Route deactivated" };
}

// ── Route Stop Actions ────────────────────────────────────────────────────────

export async function addStopToRouteAction(data: {
	routeId: number;
	stopName: string;
	stopOrder: number;
	latitude?: number;
	longitude?: number;
}) {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	if (!data.stopName?.trim() || !data.stopOrder) {
		return { success: false, error: "Stop name and stop order are required" };
	}

	let lat = data.latitude?.toString() ?? null;
	let lng = data.longitude?.toString() ?? null;
	let coordsFound = false;

	if (!lat || !lng) {
		const coords = await getCoordinates(data.stopName);
		if (coords) {
			lat = coords.latitude.toString();
			lng = coords.longitude.toString();
			coordsFound = true;
		}
	}

	const [newStop] = await db
		.insert(routeStops)
		.values({
			routeId: data.routeId,
			stopName: data.stopName.trim(),
			stopOrder: data.stopOrder,
			latitude: lat,
			longitude: lng,
		})
		.onConflictDoUpdate({
			target: [routeStops.routeId, routeStops.stopOrder],
			set: {
				stopName: data.stopName.trim(),
				latitude: lat,
				longitude: lng,
			},
		})
		.returning();

	revalidatePath("/dashboard");
	return { success: true, data: newStop, coordinates_found: coordsFound };
}

export async function deleteStopAction(stopId: number) {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	await db.delete(routeStops).where(eq(routeStops.id, stopId));

	revalidatePath("/dashboard");
	return { success: true, message: "Stop deleted" };
}

// ── Fare Management Actions ──────────────────────────────────────────────────

export async function setFareAction(data: {
	routeId: number;
	fromStopId: number;
	toStopId: number;
	fareInr: number;
}) {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	if (
		!data.routeId ||
		!data.fromStopId ||
		!data.toStopId ||
		data.fareInr === undefined
	) {
		return {
			success: false,
			error: "Route ID, from stop ID, to stop ID and fare are required",
		};
	}

	if (data.fromStopId === data.toStopId) {
		return { success: false, error: "From and to stops cannot be the same" };
	}

	if (data.fareInr <= 0) {
		return { success: false, error: "Fare must be greater than 0" };
	}

	const [newFare] = await db
		.insert(fares)
		.values({
			routeId: data.routeId,
			fromStopId: data.fromStopId,
			toStopId: data.toStopId,
			fareInr: data.fareInr.toFixed(2),
		})
		.onConflictDoUpdate({
			target: [fares.routeId, fares.fromStopId, fares.toStopId],
			set: {
				fareInr: data.fareInr.toFixed(2),
				updatedAt: new Date(),
			},
		})
		.returning();

	// Fetch stop names for UI ease
	const [fromStop] = await db
		.select({ name: routeStops.stopName })
		.from(routeStops)
		.where(eq(routeStops.id, data.fromStopId));

	const [toStop] = await db
		.select({ name: routeStops.stopName })
		.from(routeStops)
		.where(eq(routeStops.id, data.toStopId));

	revalidatePath("/dashboard");
	return {
		success: true,
		data: {
			...newFare,
			from_stop_name: fromStop?.name,
			to_stop_name: toStop?.name,
		},
	};
}

export async function setFaresBulkAction(data: {
	routeId: number;
	faresList: Array<{
		fromStopId: number;
		toStopId: number;
		fareInr: number;
	}>;
}) {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	if (
		!data.routeId ||
		!Array.isArray(data.faresList) ||
		!data.faresList.length
	) {
		return { success: false, error: "Route ID and fares list are required" };
	}

	const results = [];
	for (const f of data.faresList) {
		if (!f.fromStopId || !f.toStopId || f.fareInr === undefined) continue;
		if (f.fromStopId === f.toStopId) continue;
		if (f.fareInr <= 0) continue;

		const [newFare] = await db
			.insert(fares)
			.values({
				routeId: data.routeId,
				fromStopId: f.fromStopId,
				toStopId: f.toStopId,
				fareInr: f.fareInr.toFixed(2),
			})
			.onConflictDoUpdate({
				target: [fares.routeId, fares.fromStopId, fares.toStopId],
				set: {
					fareInr: f.fareInr.toFixed(2),
					updatedAt: new Date(),
				},
			})
			.returning();
		results.push(newFare);
	}

	revalidatePath("/dashboard");
	return { success: true, data: results, count: results.length };
}

export async function getFaresByRouteAction(routeId: number) {
	const faresList = await db
		.select({
			id: fares.id,
			fareInr: fares.fareInr,
			updatedAt: fares.updatedAt,
			fromStopId: fares.fromStopId,
			fromStopName: routeStops.stopName,
			fromOrder: routeStops.stopOrder,
		})
		.from(fares)
		.innerJoin(routeStops, eq(routeStops.id, fares.fromStopId))
		.where(eq(fares.routeId, routeId));

	// Match each fare record with its corresponding destination stop name/order
	const enrichedFares = await Promise.all(
		faresList.map(async (f) => {
			const [destStop] = await db
				.select({
					name: routeStops.stopName,
					order: routeStops.stopOrder,
				})
				.from(routeStops)
				// We need to join with toStopId which is fares.toStopId.
				// Since we selected routeStops, let's query the destination explicitly.
				.where(eq(routeStops.id, fares.toStopId)); // Wait, we can get fares.toStopId in our select or query it.

			// Let's modify the query below to join properly
			return f;
		}),
	);

	// Let's rewrite this query to do double joins correctly:
	const fromStopsAlias = sql`from_stops`;
	const toStopsAlias = sql`to_stops`;

	// Let's do a direct database query via sql, which is cleaner for double joins on same table:
	const queryResult = await db.execute(sql`
		SELECT f.id, f.fare_inr, f.updated_at, 
		       sf.id as from_stop_id, sf.stop_name as from_stop_name, sf.stop_order as from_order, 
		       st.id as to_stop_id, st.stop_name as to_stop_name, st.stop_order as to_order 
		FROM fares f 
		JOIN route_stops sf ON sf.id = f.from_stop_id 
		JOIN route_stops st ON st.id = f.to_stop_id 
		WHERE f.route_id = ${routeId} 
		ORDER BY sf.stop_order, st.stop_order
	`);

	return { success: true, data: rowsOf(queryResult) };
}

export async function lookupFareAction(params: {
	routeId: number;
	fromStopId: number;
	toStopId: number;
}) {
	const queryResult = await db.execute(sql`
		SELECT f.fare_inr, sf.stop_name as from_name, st.stop_name as to_name 
		FROM fares f 
		JOIN route_stops sf ON sf.id = f.from_stop_id 
		JOIN route_stops st ON st.id = f.to_stop_id 
		WHERE f.route_id = ${params.routeId} 
		  AND f.from_stop_id = ${params.fromStopId} 
		  AND f.to_stop_id = ${params.toStopId}
	`);

	const rows = rowsOf(queryResult);
	if (!rows.length) {
		return { success: false, error: "No fare set for this stop pair" };
	}

	return { success: true, data: rows[0] };
}

export async function deleteFareAction(fareId: number) {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	await db.delete(fares).where(eq(fares.id, fareId));

	revalidatePath("/dashboard");
	return { success: true, message: "Fare deleted" };
}
