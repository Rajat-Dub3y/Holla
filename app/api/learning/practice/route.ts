import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { consumeLearningCredit, getCreditBalance } from "@/lib/credits";
import { practiceChatTurn, type ThreadMessageForPrompt } from "@/lib/gemini";
import { recordLearningSessionAndAwardBonus } from "@/lib/learning";

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creditCheck = await consumeLearningCredit(userId);
  if (!creditCheck.allowed) {
    const balance = await getCreditBalance(userId);
    return NextResponse.json(
      { error: "no_credits", message: "Out of practice sessions for today.", dailyResetAt: balance?.dailyResetAt },
      { status: 402 },
    );
  }

  const { personaDescription, conversationSoFar, hisNewMessage } = (await req.json()) as {
    personaDescription: string;
    conversationSoFar: ThreadMessageForPrompt[];
    hisNewMessage: string;
  };

  if (!personaDescription || !hisNewMessage?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await practiceChatTurn({
    personaDescription,
    conversationSoFar: conversationSoFar ?? [],
    hisNewMessage,
  });

  // Award the small completion bonus on every turn, not just at the "end"
  // of a session — a practice chat has no natural endpoint the backend can
  // detect, so per-turn is the simplest honest interpretation of "completing
  // a practice session" from the gamification spec.
  await recordLearningSessionAndAwardBonus({
    userId,
    type: "persona_practice",
    content: { personaDescription, hisNewMessage, herReply: result.herReply },
  });

  return NextResponse.json(result);
}