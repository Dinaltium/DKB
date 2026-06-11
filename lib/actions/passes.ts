"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { passes, transactions } from "@/lib/db/schema";
import { generatePassUID } from "@/lib/services/qr";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ── Apply for Pass ──────────────────────────────────────────────────────────

export async function applyPassAction(data: {
	passType: "student" | "monthly";
	studentName?: string;
	collegeName?: string;
	studentIdNumber?: string;
	yearOfPassing?: number;
	feeTxnId?: string;
}) {
	const session = await auth();
	if (!session) return { success: false, error: "Not authenticated" };

	if (!data.passType) {
		return { success: false, error: "pass_type required" };
	}

	if (data.passType === "student") {
		if (
			!data.studentName?.trim() ||
			!data.collegeName?.trim() ||
			!data.studentIdNumber?.trim()
		) {
			return { success: false, error: "Student details required" };
		}
	}

	// Check for existing pending/active pass
	const existing = await db
		.select()
		.from(passes)
		.where(
			and(
				eq(passes.userId, session.user.id),
				eq(passes.passType, data.passType),
				sql`${passes.status} IN ('pending_verification', 'active')`,
			),
		);

	if (existing.length) {
		return {
			success: false,
			error: "You already have a pending or active pass of this type",
		};
	}

	const passUid = await generatePassUID(data.passType);

	const [pass] = await db
		.insert(passes)
		.values({
			passUid,
			userId: session.user.id,
			passType: data.passType,
			studentName: data.studentName?.trim() ?? null,
			collegeName: data.collegeName?.trim() ?? null,
			studentIdNumber: data.studentIdNumber?.trim() ?? null,
			yearOfPassing: data.yearOfPassing ?? null,
			feeTxnId: data.feeTxnId?.trim() ?? null,
		})
		.returning();

	// Record application fee transaction
	if (data.feeTxnId?.trim()) {
		await db.insert(transactions).values({
			userId: session.user.id,
			amountInr: "50.00",
			type: "pass_payment",
			upiTxnId: data.feeTxnId.trim(),
			status: "confirmed",
		});
	}

	revalidatePath("/dashboard");
	return {
		success: true,
		message: "Pass application submitted. Pending admin verification.",
		data: { passUid, id: pass.id },
	};
}

// ── Verify Pass (Admin) ────────────────────────────────────────────────────

export async function verifyPassAction(data: {
	passId: number;
	action: "approve" | "reject";
	rejectionReason?: string;
}) {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	const [pass] = await db
		.select()
		.from(passes)
		.where(eq(passes.id, data.passId));

	if (!pass) return { success: false, error: "Pass not found" };

	if (data.action === "approve") {
		const now = new Date();
		const validUntil =
			pass.passType === "student"
				? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
				: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

		await db
			.update(passes)
			.set({
				status: "active",
				verifiedBy: session.user.id,
				validFrom: now,
				validUntil,
			})
			.where(eq(passes.id, data.passId));

		return {
			success: true,
			message: "Pass approved",
			data: { validUntil },
		};
	}

	await db
		.update(passes)
		.set({
			status: "rejected",
			verifiedBy: session.user.id,
			rejectionReason: data.rejectionReason ?? "Not approved",
		})
		.where(eq(passes.id, data.passId));

	return { success: true, message: "Pass rejected" };
}

// ── Get My Passes ───────────────────────────────────────────────────────────

export async function getMyPassesAction() {
	const session = await auth();
	if (!session) return { success: false, error: "Not authenticated" };

	const result = await db
		.select()
		.from(passes)
		.where(eq(passes.userId, session.user.id))
		.orderBy(desc(passes.createdAt));

	return { success: true, data: result };
}

// ── Get Pending Passes (Admin) ──────────────────────────────────────────────

export async function getPendingPassesAction() {
	const session = await auth();
	if (!session || session.user.role !== "admin") {
		return { success: false, error: "Unauthorised" };
	}

	const pending = await db
		.select()
		.from(passes)
		.where(eq(passes.status, "pending_verification"))
		.orderBy(desc(passes.createdAt));

	return { success: true, data: pending };
}
