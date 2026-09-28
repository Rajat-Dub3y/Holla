import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getRandomQuizScenario, QUIZ_BANK, recordLearningSessionAndAwardBonus } from "@/lib/learning";

// Quizzes are free to fetch/answer — no credit gate. They're the "something
// to do when you're out of credits" loop per the spec, so gating them on
// credits would defeat their purpose.
export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scenario = getRandomQuizScenario();
  // Don't leak the correct answer/explanation in the GET response — those
  // only come back after the user submits their pick.
  return NextResponse.json({
    id: scenario.id,
    herMessage: scenario.herMessage,
    options: scenario.options,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scenarioId, selectedOptionId } = (await req.json()) as {
    scenarioId: string;
    selectedOptionId: string;
  };

  const scenario = QUIZ_BANK.find((q) => q.id === scenarioId);
  if (!scenario) {
    return NextResponse.json({ error: "Unknown scenario" }, { status: 404 });
  }

  const correct = selectedOptionId === scenario.correctOptionId;

  await recordLearningSessionAndAwardBonus({
    userId,
    type: "quiz",
    content: { scenarioId, selectedOptionId, correct },
  });

  return NextResponse.json({
    correct,
    correctOptionId: scenario.correctOptionId,
    explanation: scenario.explanation,
  });
}