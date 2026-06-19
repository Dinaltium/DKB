"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const onboardingSchema = z.object({
	name: z.string().trim().min(2).max(80),
	phone: z
		.string()
		.trim()
		.transform((s) => s.replace(/[\s-]/g, ""))
		.pipe(z.string().regex(/^\+?\d{7,15}$/, "Enter a valid phone number")),
});

export async function completeOnboardingAction(input: {
	name: string;
	phone: string;
}) {
	const session = await auth();
	if (!session?.user?.id) {
		return { success: false, error: "Not authenticated" } as const;
	}

	const parsed = onboardingSchema.safeParse(input);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues[0]?.message ?? "Invalid input",
		} as const;
	}

	await db
		.update(users)
		.set({
			name: parsed.data.name,
			phone: parsed.data.phone,
			onboardedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(users.id, session.user.id));

	revalidatePath("/");
	revalidatePath("/dashboard");
	return { success: true } as const;
}
