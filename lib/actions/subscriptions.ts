"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── Apply Subscription (Operator) ───────────────────────────────────────────

export async function applySubscriptionAction(data: {
	numBuses: number;
	amountPaidInr: number;
	upiTxnId: string;
}) {
	const session = await auth();
	if (!session || session.user.role !== "operator") {
		return { success: false, error: "Unauthorised" };
	}

	if (!data.numBuses || !data.amountPaidInr || !data.upiTxnId?.trim()) {
		return { success: false, error: "All fields required" };
	}

	// Check for existing active subscription
	const existing = await db
		.select()
		.from(subscriptions)
		.where(
			and(
				eq(subscriptions.operatorId, session.user.id),
				sql`${subscriptions.status} IN ('pending_verification', 'active')`,
			),
		);

	if (existing.length) {
		return {
			success: false,
			error: "You already have a pending or active subscription",
		};
	}

	const [sub] = await db
		.insert(subscriptions)
		.values({
			operatorId: session.user.id,
			numBuses: data.numBuses,
			amountPaidInr: data.amountPaidInr.toFixed(2),
			upiTxnId: data.upiTxnId.trim(),
		})
		.returning();

	revalidatePath("/dashboard");
	return {
		success: true,
		message: "Subscription application submitted. Pending admin verification.",
		data: sub,
	};
}

// ── Verify Subscription (Admin) ─────────────────────────────────────────────

export async function verifySubscriptionAction(data: {
	subscriptionId: number;
	action: "approve" | "reject";
	rejectionReason?: string;
}) {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	const [sub] = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.id, data.subscriptionId));

	if (!sub) return { success: false, error: "Subscription not found" };

	if (data.action === "approve") {
		const now = new Date();
		const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

		await db
			.update(subscriptions)
			.set({
				status: "active",
				verifiedBy: session.user.id,
				startsAt: now,
				expiresAt,
			})
			.where(eq(subscriptions.id, data.subscriptionId));

		return { success: true, message: "Subscription approved" };
	}

	await db
		.update(subscriptions)
		.set({
			status: "rejected",
			verifiedBy: session.user.id,
			rejectionReason: data.rejectionReason ?? "Not approved",
		})
		.where(eq(subscriptions.id, data.subscriptionId));

	return { success: true, message: "Subscription rejected" };
}

// ── Get My Subscription (Operator) ──────────────────────────────────────────

export async function getMySubscriptionAction() {
	const session = await auth();
	if (!session) return { success: false, error: "Not authenticated" };

	const subs = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.operatorId, session.user.id))
		.orderBy(desc(subscriptions.createdAt))
		.limit(5);

	return { success: true, data: subs };
}

// ── Get Pending Subscriptions (Admin) ───────────────────────────────────────

export async function getPendingSubscriptionsAction() {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	const pending = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.status, "pending_verification"))
		.orderBy(desc(subscriptions.createdAt));

	return { success: true, data: pending };
}
