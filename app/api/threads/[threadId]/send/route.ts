import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { generateEncouragementNote, type ThreadMessageForPrompt } from "@/lib/gemini";
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

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const priorMessages = await db.query.messages.findMany({
    where: eq(messages.threadId, threadId),
    orderBy: asc(messages.createdAt),
  });

  const threadHistory: ThreadMessageForPrompt[] = priorMessages
    .filter((m) => m.sender === "user" || m.sender === "match")
    .map((m) => ({ sender: m.sender as "user" | "match", content: m.content }));

  // Persist his message first, same reasoning as the incoming-message route —
  // don't lose it if the encouragement-note generation below fails.
  const [hisMessage] = await db
    .insert(messages)
    .values({ threadId, sender: "user", content })
    .returning();

  const persona = await db.query.userPersonas.findFirst({
    where: eq(userPersonas.userId, userId),
  });

  let encouragementNote = null;
  try {
    const { encouragement } = await generateEncouragementNote({
      threadHistory,
      sentMessage: content,
      persona: persona ? { coachingTone: undefined, communicationStyle: persona.communicationStyle } : undefined,
    });

    [encouragementNote] = await db
      .insert(messages)
      .values({
        threadId,
        sender: "coach_annotation",
        content: encouragement,
        metadata: { encouragement },
      })
      .returning();
  } catch (err) {
    console.error("Encouragement generation failed:", err);
    // His message is already saved — proceed without the encouragement note
    // rather than fail the whole send.
  }

  await db.update(threads).set({ lastActivityAt: new Date() }).where(eq(threads.id, threadId));

  return NextResponse.json({ hisMessage, encouragementNote });
}