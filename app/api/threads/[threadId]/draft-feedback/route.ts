import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getDraftFeedback, type ThreadMessageForPrompt } from "@/lib/gemini";
import { db } from "@/lib/db";
import { threads, messages, userPersonas } from "@/lib/Schema";
import { eq, and, asc } from "drizzle-orm";

export async function POST(
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

  const { draftText } = await req.json();
  if (!draftText?.trim()) {
    return NextResponse.json({ error: "Empty draft" }, { status: 400 });
  }

  const priorMessages = await db.query.messages.findMany({
    where: eq(messages.threadId, threadId),
    orderBy: asc(messages.createdAt),
  });

  const threadHistory: ThreadMessageForPrompt[] = priorMessages
    .filter((m) => m.sender === "user" || m.sender === "match")
    .map((m) => ({ sender: m.sender as "user" | "match", content: m.content }));

  const persona = await db.query.userPersonas.findFirst({
    where: eq(userPersonas.userId, userId),
  });

  const { feedback } = await getDraftFeedback({
    threadHistory,
    draftText,
    persona: persona ? { communicationStyle: persona.communicationStyle } : undefined,
  });

  return NextResponse.json({ feedback });
}