import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { canCreateNewThread } from "@/lib/credits";
import { db } from "@/lib/db";
import { threads, messages } from "@/lib/Schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = params;

  const thread = await db.query.threads.findFirst({
    where: and(eq(threads.id, threadId), eq(threads.userId, userId)),
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const threadMessages = await db.query.messages.findMany({
    where: eq(messages.threadId, threadId),
    orderBy: asc(messages.createdAt),
  });

  return NextResponse.json({ thread, messages: threadMessages });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = await req.json() as { status: string };
  if (status !== "active" && status !== "archived") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const thread = await db.query.threads.findFirst({
    where: and(eq(threads.id, params.threadId), eq(threads.userId, userId)),
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  if (status === "active" && thread.status !== "active") {
    const check = await canCreateNewThread(userId);
    if (!check.allowed) {
      return NextResponse.json({ error: "thread_cap" }, { status: 402 });
    }
  }

  const [updated] = await db.update(threads)
    .set({ status })
    .where(eq(threads.id, params.threadId))
    .returning();
  return NextResponse.json({ thread: updated });
}