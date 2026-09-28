import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/Schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { persona: true, creditBalance: true },
  });
  if (!result) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { persona, creditBalance, ...user } = result;
  return NextResponse.json({ user, persona, creditBalance });
}