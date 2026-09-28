import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { consumeAnalyzeCredit, getCreditBalance, refundAnalyzeCredit } from "@/lib/credits";
import { analyzeIncomingMessage, type ThreadMessageForPrompt } from "@/lib/gemini";
import { db } from "@/lib/db";
import { threads, messages, userPersonas } from "@/lib/Schema";
import { eq, and, asc } from "drizzle-orm";

type RequestBody =
  | { type: "text"; content: string }
  | { type: "screenshot"; imageBase64: string; mimeType: string };

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = params;

  // Confirm this thread actually belongs to the caller — never trust the
  // threadId in the URL alone.
  const thread = await db.query.threads.findFirst({
    where: and(eq(threads.id, threadId), eq(threads.userId, userId)),
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const body: RequestBody = await req.json();
  if (body.type === "text" && !body.content?.trim()) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  // Gate on credits BEFORE calling Gemini — no point spending an API call
  // if the user's out of analyze-credits for today.
  const creditCheck = await consumeAnalyzeCredit(userId);
  if (!creditCheck.allowed) {
    const balance = await getCreditBalance(userId);
    return NextResponse.json(
      {
        error: "no_credits",
        message: "Out of analyses for today.",
        dailyResetAt: balance?.dailyResetAt,
      },
      { status: 402 }, // Payment Required — signals "this is the upsell moment," not a generic 4xx
    );
  }

  // Store her incoming message first, so it's persisted even if the Gemini
  // call below fails for some reason (network blip, model error, etc.) —
  // we'd rather have her message saved with a missing annotation than lose it.
  const [herMessage] = await db
    .insert(messages)
    .values({
      threadId,
      sender: "match",
      content: body.type === "text" ? body.content : "[screenshot]",
    })
    .returning();

  // Pull prior thread history for context (the same message means different
  // things on message 2 vs. message 12).
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

  let analysis;
  try {
    analysis = await analyzeIncomingMessage({
      threadHistory,
      newMessage:
        body.type === "text"
          ? { type: "text", content: body.content }
          : { type: "screenshot", imageBase64: body.imageBase64, mimeType: body.mimeType },
      persona: persona
        ? { communicationStyle: persona.communicationStyle, focusArea: persona.focusArea }
        : undefined,
    });
  } catch (err) {
    console.error("Gemini analysis failed:", err);
    await refundAnalyzeCredit(userId);
    // Her message is already saved — return it without an annotation rather
    // than a hard failure, so the thread isn't left in a broken state.
    return NextResponse.json({ herMessage, coachAnnotation: null, error: "analysis_failed" });
  }

  const [coachAnnotation] = await db
    .insert(messages)
    .values({
      threadId,
      sender: "coach_annotation",
      content: analysis.insight,
      metadata: { insight: analysis.insight, nextStepPrompt: analysis.nextStepPrompt },
    })
    .returning();

  await db.update(threads).set({ lastActivityAt: new Date() }).where(eq(threads.id, threadId));

  return NextResponse.json({ herMessage, coachAnnotation });
}