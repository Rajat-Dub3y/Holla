import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { canCreateNewThread } from "@/lib/credits";
import { db } from "@/lib/db";
import { threads, messages } from "@/lib/Schema";
import { eq, desc, and, inArray } from "drizzle-orm";

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

  const threadsWithPreview = await Promise.all(userThreads.map(async (thread) => {
    const latestMessage = await db.query.messages.findFirst({
      where: and(eq(messages.threadId, thread.id), inArray(messages.sender, ["match", "user"])),
      orderBy: desc(messages.createdAt),
    });
    const firstUserMessage = await db.query.messages.findFirst({
      where: and(eq(messages.threadId, thread.id), eq(messages.sender, "user")),
    });
    return {
      ...thread,
      preview: latestMessage?.content ?? "",
      lastMessageSender: latestMessage?.sender ?? null,
      hasUserMessage: Boolean(firstUserMessage),
    };
  }));

  return NextResponse.json({ threads: threadsWithPreview });
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