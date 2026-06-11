"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getNotificationsAction() {
	const session = await auth();
	if (!session) return { success: false, error: "Unauthorised" };
	const userId = session.user.id;

	const list = await db
		.select()
		.from(notifications)
		.where(eq(notifications.userId, userId))
		.orderBy(desc(notifications.createdAt));

	return { success: true, data: list };
}

export async function markNotificationReadAction(notificationId: number) {
	const session = await auth();
	if (!session) return { success: false, error: "Unauthorised" };
	const userId = session.user.id;

	const [updated] = await db
		.update(notifications)
		.set({ isRead: true })
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.userId, userId),
			),
		)
		.returning();

	if (!updated) {
		return { success: false, error: "Notification not found or unauthorised" };
	}

	revalidatePath("/dashboard");
	return { success: true, data: updated };
}

export async function createNotification(
	userId: string,
	title: string,
	message: string,
	type: "info" | "success" | "warning" | "error" = "info",
) {
	const [newNotif] = await db
		.insert(notifications)
		.values({
			userId,
			title,
			message,
			type,
		})
		.returning();
	return newNotif;
}
