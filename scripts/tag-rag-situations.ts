/**
 * Tags every rag_chunks row with situation tags using Gemini (chat model, so it
 * does NOT use the 1,000/day embedding quota).
 *
 *   1. Add the column first (one time):  see sql in scripts/rag-situations.sql
 *   2. npx tsx --env-file=.env.local scripts/tag-rag-situations.ts
 *
 * Resumable: only chunks with situations IS NULL are processed, so if it stops
 * (rate limit, Ctrl+C) just run it again.
 *   --limit 200   only tag the next 200 chunks (good for a first test)
 *   --retag       clear all tags first and start over
 */
import { GoogleGenAI, Type } from "@google/genai";
import { db } from "@/lib/db";
import { ragChunks } from "@/lib/Schema";
import { eq, isNull, sql } from "drizzle-orm";
import { SITUATION_TAGS } from "@/lib/rag/situations";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
const MODEL = "gemini-3.5-flash-lite";
const BATCH = 10;
const PAUSE_MS = 4500;
const MAX_CHARS = 900;

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) || Infinity : Infinity;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SYSTEM = `You label chunks of dating-coaching material for a texting assistant.
For each chunk, return 1 to 3 tags describing the TEXTING SITUATION the advice helps with. Tags:
- opener: first message to a match, using her profile
- first_reply: she messaged first, or a just-matched low-effort "hey"
- low_effort: she sends short, dry, vague replies ("lol", "yeah", "good thanks")
- she_asked_question: how to answer a question she asked
- she_shared: she shared something about herself; building rapport from it
- teasing_test: she teases, tests or challenges him
- build_rapport: keeping a text conversation fun and flowing
- ask_her_out: moving a chat to a date with a specific plan
- vague_about_meeting: she is hesitant, busy, "maybe sometime", flaky
- going_cold: she stopped replying, replies shrinking, follow-ups
- general_principle: mindset or principles that apply to any chat (confidence, frame, not being needy)
- off_topic: not about texting or messaging (in-person approach, gym, clothes, pickup in clubs, ads, intros, channel promos)
Use off_topic ALONE when the chunk is not useful for texting someone on a dating app. Use only tags from the list.`;

const SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      i: { type: Type.INTEGER },
      tags: { type: Type.ARRAY, items: { type: Type.STRING, enum: [...SITUATION_TAGS] } },
    },
    required: ["i", "tags"],
  },
};

async function tagBatch(texts: string[]): Promise<string[][]> {
  const prompt = texts.map((t, i) => `[${i}]\n${t.slice(0, MAX_CHARS)}`).join("\n\n---\n\n");
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { systemInstruction: SYSTEM, responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0 },
      });
      const parsed = JSON.parse(res.text ?? "[]") as Array<{ i: number; tags: string[] }>;
      const out: string[][] = texts.map(() => ["general_principle"]);
      for (const p of parsed) {
        if (p.i >= 0 && p.i < texts.length) {
          const tags = (p.tags ?? []).filter((t) => (SITUATION_TAGS as readonly string[]).includes(t));
          if (tags.length) out[p.i] = tags.slice(0, 3);
        }
      }
      return out;
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      if (/RESOURCE_EXHAUSTED|429/.test(msg) && /per ?day|daily|PerDay/i.test(msg)) throw new Error("DAILY_QUOTA");
      if (attempt >= 4) throw err;
      const wait = 15000 * attempt;
      console.log(`  …retrying in ${wait / 1000}s (${msg.slice(0, 80)})`);
      await sleep(wait);
    }
  }
}

async function main() {
  if (args.includes("--retag")) {
    await db.update(ragChunks).set({ situations: null });
    console.log("Cleared all tags.");
  }

  let done = 0;
  while (done < LIMIT) {
    const take = Math.min(BATCH * 4, LIMIT - done);
    const rows = await db
      .select({ id: ragChunks.id, text: ragChunks.chunkText })
      .from(ragChunks)
      .where(isNull(ragChunks.situations))
      .limit(take);
    if (rows.length === 0) break;

    for (let i = 0; i < rows.length; i += BATCH) {
      const group = rows.slice(i, i + BATCH);
      let tags: string[][];
      try {
        tags = await tagBatch(group.map((r) => r.text));
      } catch (e) {
        if ((e as Error).message === "DAILY_QUOTA") {
          console.log(`\nDaily Gemini quota reached after ${done} chunks. Run again after the reset; it resumes.`);
          return summary();
        }
        throw e;
      }
      await Promise.all(group.map((r, j) => db.update(ragChunks).set({ situations: tags[j] }).where(eq(ragChunks.id, r.id))));
      done += group.length;
      console.log(`tagged ${done}`);
      await sleep(PAUSE_MS);
    }
  }
  console.log(`\nDone. Tagged ${done} chunks this run.`);
  await summary();
}

async function summary() {
  const [{ left }] = await db.select({ left: sql<number>`count(*)::int` }).from(ragChunks).where(isNull(ragChunks.situations));
  console.log(`Chunks still untagged: ${left}`);
  const rows = await db.execute(sql`SELECT t AS tag, count(*)::int AS n FROM rag_chunks, unnest(situations) AS t GROUP BY t ORDER BY n DESC`);
  console.table((rows as any).rows ?? rows);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});