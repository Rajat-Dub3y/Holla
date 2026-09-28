import { db } from "@/lib/db";
import { learningSessions, creditBalances } from "@/lib/Schema";
import { and, eq, gte, sql } from "drizzle-orm";

const LEARNING_COMPLETION_BONUS = 1; // small, per the MVP spec — a "welcome back" gesture, not a cap workaround
const MAX_DAILY_LEARNING_BONUS = 3;

export type QuizScenario = {
  id: string;
  herMessage: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
};

// Small static bank for MVP — matches the spec's framing of quizzes as
// "bite-sized skill reinforcement," not something that needs live
// generation. Expand this list over time rather than generating on the fly.
export const QUIZ_BANK: QuizScenario[] = [
  {
    id: "q1",
    herMessage: "haha yeah maybe, we'll see",
    options: [
      { id: "a", text: "Ask three follow-up questions to pin her down" },
      { id: "b", text: "Match her light tone and suggest something specific" },
      { id: "c", text: "Go quiet and wait for her to commit" },
    ],
    correctOptionId: "b",
    explanation: "\"We'll see\" is noncommittal but not a no — pushing for a firm answer reads as pressure. Matching her light energy with a specific, low-stakes suggestion keeps it easy for her to say yes to.",
  },
  {
    id: "q2",
    herMessage: "omg I love that band too!!",
    options: [
      { id: "a", text: "\"Cool\" and change the subject" },
      { id: "b", text: "Share a specific memory or opinion about the band, then ask hers" },
      { id: "c", text: "List five more bands you like" },
    ],
    correctOptionId: "b",
    explanation: "She just gave you real enthusiasm and common ground — build on the specific thing she shared rather than pivoting away from it or turning it into a one-sided list.",
  },
];

export function getRandomQuizScenario(): QuizScenario {
  return QUIZ_BANK[Math.floor(Math.random() * QUIZ_BANK.length)];
}

export async function recordLearningSessionAndAwardBonus(params: {
  userId: string;
  type: "persona_practice" | "quiz" | "qna";
  content: Record<string, unknown>;
}) {
  const { userId, type, content } = params;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ earnedToday }] = await db
    .select({ earnedToday: sql<string>`coalesce(sum(${learningSessions.creditsEarned}), 0)` })
    .from(learningSessions)
    .where(and(eq(learningSessions.userId, userId), gte(learningSessions.createdAt, startOfToday)));
  const awardable = Math.max(
    0,
    Math.min(LEARNING_COMPLETION_BONUS, MAX_DAILY_LEARNING_BONUS - Number(earnedToday)),
  );

  await db.insert(learningSessions).values({
    userId,
    type,
    content,
    creditsEarned: awardable,
  });

  if (awardable > 0) {
    await db
      .update(creditBalances)
      .set({
        analyzeCreditsRemaining: sql`${creditBalances.analyzeCreditsRemaining} + ${awardable}`,
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, userId));
  }
}