import { GoogleGenAI, Type } from "@google/genai";
import { db } from "@/lib/db";
import { threads, messages, profileInsights } from "@/lib/Schema";
import { eq, count, avg, sql } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
const MODEL = "gemini-2.5-flash-lite";

const INSIGHTS_STALE_AFTER_MS = 1000 * 60 * 60 * 24; // regenerate once a day at most

type ConversationStats = {
  totalThreads: number;
  activeThreads: number;
  avgMessagesPerThread: number;
  totalUserMessages: number;
};

async function computeStats(userId: string): Promise<ConversationStats> {
  const [threadCounts] = await db
    .select({
      total: count(),
    })
    .from(threads)
    .where(eq(threads.userId, userId));

  const [activeCounts] = await db
    .select({ active: count() })
    .from(threads)
    .where(sql`${threads.userId} = ${userId} AND ${threads.status} = 'active'`);

  const userThreadIds = (await db.query.threads.findMany({ where: eq(threads.userId, userId) })).map(
    (t) => t.id,
  );

  let totalUserMessages = 0;
  let avgMessagesPerThread = 0;

  if (userThreadIds.length > 0) {
    const msgCounts = await Promise.all(
      userThreadIds.map((id) =>
        db
          .select({ c: count() })
          .from(messages)
          .where(sql`${messages.threadId} = ${id} AND ${messages.sender} = 'user'`)
          .then((r) => r[0].c),
      ),
    );
    totalUserMessages = msgCounts.reduce((a, b) => a + b, 0);
    avgMessagesPerThread = totalUserMessages / userThreadIds.length;
  }

  return {
    totalThreads: threadCounts.total,
    activeThreads: activeCounts.active,
    avgMessagesPerThread,
    totalUserMessages,
  };
}

type GeneratedInsight = { title: string; body: string; locked: boolean; category: string };

async function phraseStatsAsInsights(stats: ConversationStats): Promise<GeneratedInsight[]> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Here are a user's real dating-conversation stats:
- Total conversations started: ${stats.totalThreads}
- Currently active conversations: ${stats.activeThreads}
- Average messages he sends per conversation: ${stats.avgMessagesPerThread.toFixed(1)}
- Total messages sent across all conversations: ${stats.totalUserMessages}

Generate exactly 5 insights about his dating patterns based on these numbers,
phrased the way a perceptive friend would say them — NEVER a numeric score
or "Communication: 6/10" style metric. Make the first 3 genuinely
interesting and specific-feeling (these will be shown free/unlocked). Make
the last 2 have curiosity-driving titles but can be shorter/teaser-style
(these will be shown locked, title visible, body hidden, as a premium
upsell) — their titles must be specific to these numbers, never generic
stock copy like "Your biggest pattern this month."`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          insights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                body: { type: Type.STRING },
                category: { type: Type.STRING, description: "One of: openers, escalation, consistency, pattern" },
              },
              required: ["title", "body", "category"],
            },
          },
        },
        required: ["insights"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? '{"insights":[]}') as {
    insights: { title: string; body: string; category: string }[];
  };

  return parsed.insights.map((insight, i) => ({
    ...insight,
    locked: i >= 3, // first 3 free/visible, rest locked — matches the spec's 2-3 visible pattern
  }));
}

/**
 * Returns cached insights if they're fresh enough, otherwise regenerates.
 * Regeneration clears old insights first — this is a full replace, not an
 * append, since stats-based insights are only meaningful as a current snapshot.
 */
export async function getOrGenerateProfileInsights(userId: string) {
  const existing = await db.query.profileInsights.findMany({ where: eq(profileInsights.userId, userId) });

  const isFresh =
    existing.length > 0 &&
    Date.now() - existing[0].generatedAt.getTime() < INSIGHTS_STALE_AFTER_MS;

  if (isFresh) {
    return existing;
  }

  const stats = await computeStats(userId);

  // Not enough data yet for meaningful insights — return nothing rather
  // than forcing Gemini to invent something from near-zero signal.
  if (stats.totalThreads === 0) {
    return [];
  }

  const generated = await phraseStatsAsInsights(stats);

  await db.delete(profileInsights).where(eq(profileInsights.userId, userId));

  const inserted = await db
    .insert(profileInsights)
    .values(
      generated.map((g) => ({
        userId,
        category: g.category,
        title: g.title,
        body: g.body,
        isLocked: g.locked,
      })),
    )
    .returning();

  return inserted;
}