// lib/db/queries.ts
// Server-only. Never import in client components.

import {
	decryptBusRequestPII,
	decryptOperatorPII,
} from "@/lib/services/crypto";
import { asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import {
	type Bus,
	type Complaint,
	type NewComplaint,
	type NewPayment,
	type NewTravelHistory,
	type Payment,
	type Stop,
	busRequests,
	busRoutes,
	buses,
	complaints,
	operators,
	payments,
	stops,
	travelHistory,
	users,
} from "./schema";

// ── Composite types ───────────────────────────────────────────────────────────

/**
 * A Bus row augmented with its ordered route stop IDs.
 * Used by the search page and the simulation API so callers don't have to
 * issue a second query for bus_routes.
 */
export type BusWithRouteIds = Bus & { routeStopIds: string[] };

// ── Stops ─────────────────────────────────────────────────────────────────────

export async function getAllStops(): Promise<Stop[]> {
	return db.select().from(stops).orderBy(asc(stops.name));
}

export async function getStopById(id: string): Promise<Stop | undefined> {
	const rows = await db.select().from(stops).where(eq(stops.id, id));
	return rows[0];
}

// ── Buses ─────────────────────────────────────────────────────────────────────

export async function getAllBuses(): Promise<Bus[]> {
	return db.select().from(buses).orderBy(asc(buses.number));
}

export async function getBusById(id: string): Promise<Bus | undefined> {
	const rows = await db.select().from(buses).where(eq(buses.id, id));
	return rows[0];
}

/**
 * Returns every bus together with its ordered route stop IDs in a single
 * round-trip (two parallel queries, then joined in-process).
 *
 * Preferred over calling getAllBuses() + getRouteStopIds() in a loop.
 */
export async function getAllBusesWithRouteIds(): Promise<BusWithRouteIds[]> {
	const [allBuses, allRouteRows] = await Promise.all([
		getAllBuses(),
		db
			.select({ busId: busRoutes.busId, stopId: busRoutes.stopId })
			.from(busRoutes)
			.orderBy(asc(busRoutes.busId), asc(busRoutes.stopOrder)),
	]);

	const routeMap: Record<string, string[]> = {};
	for (const r of allRouteRows) {
		if (!routeMap[r.busId]) routeMap[r.busId] = [];
		routeMap[r.busId].push(r.stopId);
	}

	return allBuses.map((bus) => ({
		...bus,
		routeStopIds: routeMap[bus.id] ?? [],
	}));
}

export async function getStopsForBus(busId: string): Promise<Stop[]> {
	const rows = await db
		.select({ stop: stops })
		.from(busRoutes)
		.innerJoin(stops, eq(busRoutes.stopId, stops.id))
		.where(eq(busRoutes.busId, busId))
		.orderBy(asc(busRoutes.stopOrder));
	return rows.map((r) => r.stop);
}

export async function getRouteStopIds(busId: string): Promise<string[]> {
	const rows = await db
		.select({ stopId: busRoutes.stopId })
		.from(busRoutes)
		.where(eq(busRoutes.busId, busId))
		.orderBy(asc(busRoutes.stopOrder));
	return rows.map((r) => r.stopId);
}

// ── Operators ─────────────────────────────────────────────────────────────────

export async function getOperatorByUserId(userId: string) {
	const rows = await db
		.select()
		.from(operators)
		.where(eq(operators.userId, userId));
	return rows[0] ? decryptOperatorPII(rows[0]) : rows[0];
}

export async function getBusesForOperator(operatorId: string): Promise<Bus[]> {
	return db
		.select()
		.from(buses)
		.where(eq(buses.operatorId, operatorId))
		.orderBy(asc(buses.number));
}

export async function getAllOperators() {
	const rows = await db
		.select({
			operator: operators,
			user: {
				name: users.name,
				email: users.email,
				mustChangePassword: users.mustChangePassword,
				passwordExpiresAt: users.passwordExpiresAt,
				createdAt: users.createdAt,
			},
		})
		.from(operators)
		.innerJoin(users, eq(operators.userId, users.id))
		.orderBy(asc(operators.companyName));
	return rows.map((r) => ({ ...r, operator: decryptOperatorPII(r.operator) }));
}

// ── Complaints ────────────────────────────────────────────────────────────────

export async function submitComplaint(data: NewComplaint): Promise<Complaint> {
	const rows = await db.insert(complaints).values(data).returning();
	return rows[0];
}

export async function getComplaintsForBus(busId: string): Promise<Complaint[]> {
	return db
		.select()
		.from(complaints)
		.where(eq(complaints.busId, busId))
		.orderBy(desc(complaints.createdAt));
}

export async function getComplaintsForOperator(
	operatorId: string,
): Promise<Complaint[]> {
	const opBuses = await getBusesForOperator(operatorId);
	const busIds = opBuses.map((b) => b.id);
	if (!busIds.length) return [];

	// Fixed: use inArray() instead of raw ANY() for type safety
	return db
		.select()
		.from(complaints)
		.where(inArray(complaints.busId, busIds))
		.orderBy(desc(complaints.createdAt));
}

export async function getAllComplaints(): Promise<Complaint[]> {
	return db.select().from(complaints).orderBy(desc(complaints.createdAt));
}

export async function resolveComplaint(complaintId: string): Promise<void> {
	await db
		.update(complaints)
		.set({ status: "resolved" })
		.where(eq(complaints.id, complaintId));
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function recordPayment(data: NewPayment) {
	const rows = await db.insert(payments).values(data).returning();
	return rows[0];
}

export async function getPaymentsForUser(userId: string) {
	return db
		.select()
		.from(payments)
		.where(eq(payments.userId, userId))
		.orderBy(desc(payments.createdAt));
}

export async function getAllPayments(): Promise<Payment[]> {
	return db.select().from(payments).orderBy(desc(payments.createdAt));
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
	const rows = await db.select().from(users).where(eq(users.email, email));
	return rows[0];
}

export async function getUserById(id: string) {
	const rows = await db.select().from(users).where(eq(users.id, id));
	return rows[0];
}

export async function createUser(data: {
	name: string;
	email: string;
	password: string;
}) {
	const rows = await db
		.insert(users)
		.values({ ...data, role: "passenger" })
		.returning();

	return rows[0];
}

// ── Travel history (OCR) ─────────────────────────────────────────────────────

export async function saveTravelHistory(data: NewTravelHistory) {
	const rows = await db.insert(travelHistory).values(data).returning();
	return rows[0];
}

export async function getTravelHistoryForUser(userId: string) {
	return db
		.select()
		.from(travelHistory)
		.where(eq(travelHistory.userId, userId))
		.orderBy(desc(travelHistory.createdAt));
}

// ── Bus requests ──────────────────────────────────────────────────────────────

export async function getAllBusRequests() {
	const rows = await db
		.select({
			request: busRequests,
			operator: operators,
			user: { name: users.name, email: users.email },
		})
		.from(busRequests)
		.innerJoin(operators, eq(busRequests.operatorId, operators.id))
		.innerJoin(users, eq(operators.userId, users.id))
		.orderBy(desc(busRequests.createdAt));
	return rows.map((r) => ({
		...r,
		request: decryptBusRequestPII(r.request),
		operator: decryptOperatorPII(r.operator),
	}));
}

export async function getPendingBusRequests() {
	const rows = await db
		.select({
			request: busRequests,
			operator: operators,
			user: { name: users.name, email: users.email },
		})
		.from(busRequests)
		.innerJoin(operators, eq(busRequests.operatorId, operators.id))
		.innerJoin(users, eq(operators.userId, users.id))
		.where(eq(busRequests.status, "pending"))
		.orderBy(desc(busRequests.createdAt));
	return rows.map((r) => ({
		...r,
		request: decryptBusRequestPII(r.request),
		operator: decryptOperatorPII(r.operator),
	}));
}

export async function getBusRequestsByOperator(operatorId: string) {
	const rows = await db
		.select()
		.from(busRequests)
		.where(eq(busRequests.operatorId, operatorId))
		.orderBy(desc(busRequests.createdAt));
	return rows.map((r) => decryptBusRequestPII(r));
}

export async function getPendingCountForAdmin(): Promise<number> {
	const [pendingBusReqs, pendingOperators] = await Promise.all([
		db
			.select({ total: count() })
			.from(busRequests)
			.where(eq(busRequests.status, "pending")),
		db
			.select({ total: count() })
			.from(operators)
			.where(eq(operators.approved, false)),
	]);
	return (pendingBusReqs[0]?.total ?? 0) + (pendingOperators[0]?.total ?? 0);
}
