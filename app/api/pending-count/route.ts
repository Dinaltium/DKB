import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPendingCountForAdmin } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ count: 0 });
  }
  const count = await getPendingCountForAdmin();
  return NextResponse.json({ count });
}
