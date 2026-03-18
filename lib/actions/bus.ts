"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { complaints, payments, buses, operators } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getOperatorByUserId } from "@/lib/db/queries";

// ── Complaints ────────────────────────────────────────────────────────────────

export async function submitComplaintAction(data: {
  busId:       string;
  busNumber:   string;
  category:    string;
  description: string;
  photoUrl?:   string;
}) {
  const session = await auth();

  await db.insert(complaints).values({
    busId:       data.busId,
    busNumber:   data.busNumber,
    category:    data.category,
    description: data.description,
    photoUrl:    data.photoUrl,
    userId:      session?.user?.id ?? null,
    status:      "pending",
  });

  revalidatePath(`/bus/${data.busId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function resolveComplaintAction(complaintId: string) {
  const session = await auth();
  if (!session || !["operator", "admin"].includes(session.user.role)) {
    return { success: false, error: "Unauthorised" };
  }

  await db
    .update(complaints)
    .set({ status: "resolved" })
    .where(eq(complaints.id, complaintId));

  revalidatePath("/dashboard");
  return { success: true };
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function recordPaymentAction(data: {
  busId:         string;
  busNumber:     string;
  amount:        number;
  upiId:         string;
  transactionId: string;
  status:        "success" | "failed";
}) {
  const session = await auth();

  await db.insert(payments).values({
    busId:         data.busId,
    busNumber:     data.busNumber,
    amount:        data.amount,
    upiId:         data.upiId,
    transactionId: data.transactionId,
    status:        data.status,
    userId:        session?.user?.id ?? null,
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// ── Crowd votes ───────────────────────────────────────────────────────────────
// Uses a switch instead of sql.raw() to safely build the jsonb_set path.

type VoteKey = "onTime" | "slightlyLate" | "veryLate";

function voteUpdateSql(key: VoteKey) {
  switch (key) {
    case "onTime":
      return sql`jsonb_set(votes, '{onTime}',       ((COALESCE(votes->>'onTime',       '0'))::int + 1)::text::jsonb)`;
    case "slightlyLate":
      return sql`jsonb_set(votes, '{slightlyLate}', ((COALESCE(votes->>'slightlyLate', '0'))::int + 1)::text::jsonb)`;
    case "veryLate":
      return sql`jsonb_set(votes, '{veryLate}',     ((COALESCE(votes->>'veryLate',     '0'))::int + 1)::text::jsonb)`;
  }
}

export async function castVoteAction(busId: string, key: VoteKey) {
  await db
    .update(buses)
    .set({ votes: voteUpdateSql(key), updatedAt: new Date() })
    .where(eq(buses.id, busId));

  revalidatePath(`/bus/${busId}`);
  return { success: true };
}

// ── Bus status (operator only) ────────────────────────────────────────────────

export async function updateBusStatusAction(
  busId:  string,
  status: "Running" | "Not Running" | "Delayed",
) {
  const session = await auth();
  if (!session || !["operator", "admin"].includes(session.user.role)) {
    return { success: false, error: "Unauthorised" };
  }

  if (session.user.role === "operator") {
    const op = await getOperatorByUserId(session.user.id);
    if (!op) return { success: false, error: "Operator record not found" };

    const [bus] = await db
      .select({ operatorId: buses.operatorId })
      .from(buses)
      .where(eq(buses.id, busId));

    if (bus?.operatorId !== op.id) {
      return { success: false, error: "You do not own this bus" };
    }
  }

  await db
    .update(buses)
    .set({ status, updatedAt: new Date() })
    .where(eq(buses.id, busId));

  revalidatePath("/dashboard");
  revalidatePath(`/bus/${busId}`);
  return { success: true };
}

// ── Operator approval (admin only) ────────────────────────────────────────────

export async function setOperatorApprovalAction(operatorId: string, approved: boolean) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return { success: false, error: "Unauthorised" };
  }

  await db
    .update(operators)
    .set({ approved, updatedAt: new Date() })
    .where(eq(operators.id, operatorId));

  revalidatePath("/dashboard");
  return { success: true };
}

// ── Bus occupancy update (operator only) ──────────────────────────────────────

export async function updateOccupancyAction(busId: string, occupiedSeats: number) {
  const session = await auth();
  if (!session || !["operator", "admin"].includes(session.user.role)) {
    return { success: false, error: "Unauthorised" };
  }

  await db
    .update(buses)
    .set({ occupiedSeats, updatedAt: new Date() })
    .where(eq(buses.id, busId));

  revalidatePath("/dashboard");
  revalidatePath(`/bus/${busId}`);
  return { success: true };
}