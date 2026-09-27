import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { canCreateNewThread } from "@/lib/credits";
import { db } from "@/lib/db";
import { threads } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Most-recently-active first — matches how a real messaging app orders
  // its thread list, and is what the desktop two-pane view needs.
  const userThreads = await db.query.threads.findMany({
    where: eq(threads.userId, userId),
    orderBy: desc(threads.lastActivityAt),
  });

  return NextResponse.json({ threads: userThreads });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const check = await canCreateNewThread(userId);
  if (!check.allowed) {
    return NextResponse.json(
      { error: "thread_cap", message: "Focus on your top 2 conversations, or upgrade for unlimited." },
      { status: 402 },
    );
  }

  const { matchLabel, whoOpened } = await req.json();
  if (!matchLabel?.trim()) {
    return NextResponse.json({ error: "matchLabel is required" }, { status: 400 });
  }

  const [thread] = await db
    .insert(threads)
    .values({ userId, matchLabel, whoOpened })
    .returning();

  return NextResponse.json({ thread });
}