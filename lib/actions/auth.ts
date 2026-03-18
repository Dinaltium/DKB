"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, loyaltyAccounts } from "@/lib/db/schema";
import { getUserByEmail } from "@/lib/db/queries";

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ success: true; userId: string } | { success: false; error: string }> {
  try {
    // Check for existing account
    const existing = await getUserByEmail(data.email);
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    // Hash password with bcrypt (12 rounds)
    const hashed = await bcrypt.hash(data.password, 12);

    // Insert user
    const [user] = await db
      .insert(users)
      .values({
        name:     data.name.trim(),
        email:    data.email.toLowerCase().trim(),
        password: hashed,
        role:     "passenger",
      })
      .returning({ id: users.id });

    // Create empty loyalty account
    await db
      .insert(loyaltyAccounts)
      .values({ userId: user.id })
      .onConflictDoNothing();

    return { success: true, userId: user.id };
  } catch (err) {
    console.error("[registerUser]", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}