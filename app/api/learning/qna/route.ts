import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { consumeLearningCredit, getCreditBalance } from "@/lib/credits";
import { askCoachQuestion } from "@/lib/gemini";
import { recordLearningSessionAndAwardBonus } from "@/lib/learning";
import { db } from "@/lib/db";
import { userPersonas } from "@/lib/Schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creditCheck = await consumeLearningCredit(userId);
  if (!creditCheck.allowed) {
    const balance = await getCreditBalance(userId);
    return NextResponse.json(
      { error: "no_credits", message: "Out of coaching Q&A for today.", dailyResetAt: balance?.dailyResetAt },
      { status: 402 },
    );
  }

  const { question } = (await req.json()) as { question: string };
  if (!question?.trim()) {
    return NextResponse.json({ error: "Empty question" }, { status: 400 });
  }

  const persona = await db.query.userPersonas.findFirst({ where: eq(userPersonas.userId, userId) });

  const result = await askCoachQuestion({
    question,
    persona: persona ? { communicationStyle: persona.communicationStyle } : undefined,
  });

  await recordLearningSessionAndAwardBonus({
    userId,
    type: "qna",
    content: { question, answer: result.answer },
  });

  return NextResponse.json(result);
}