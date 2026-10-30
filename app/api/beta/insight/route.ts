import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { fetchCandidatePool, rankPool } from "@/lib/rag/retrieve";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Follow-up questions about ONE insight ("what she's saying" or "next move").
 * Kept apart from the main reply chat: it never changes the conversation
 * history, and the model only sees the chat so far, this one insight, and the
 * earlier questions asked about this same insight.
 *
 * Streams plain text so the answer starts appearing straight away.
 */
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
const MODEL = process.env.BETA_MODEL ?? "gemini-3.5-flash-lite";

const MAX_QUESTION = 400;
const MAX_THREAD_TURNS = 10; // 5 questions + 5 answers per insight
const PER_IP_PER_HOUR = Number(process.env.BETA_INSIGHT_PER_IP_PER_HOUR ?? 60);
const RETRIEVAL_BUDGET_MS = 1200; // skip coaching lookup if the database is slow

const HITS = new Map<string, { start: number; n: number }>();

function hashIp(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256")
    .update(ip + (process.env.BETA_IP_SALT ?? "holla-beta"))
    .digest("hex")
    .slice(0, 32);
}

const SYSTEM = `You are Holla, a dating conversation coach. A guy is looking at ONE piece of advice you gave him about a chat with a woman, and wants to ask you about it. Answer his question about THAT advice only.

RULES
- Stay on this insight and this chat. Do not bring up other advice you may have given.
- Be practical and specific. If he asks "what kind of questions", give 2 to 3 concrete example messages he could actually send, in a real guy's texting voice, built from what is in the chat. If he asks "why", explain the reasoning in plain words. If he asks "what if she...", give a clear next step.
- Short: usually under 90 words. Plain text, no markdown, no headings. A short list of examples is fine, one per line.
- Speak to him as "you". Never write "Jack". Never write her name.
- Only use facts that are in the chat or the insight. Never invent details about her. If an example needs a fact about him you were not given, use a short [placeholder] like [city].
- Confident and respectful. No pickup lines, no negging, no manipulation, no needy or begging messages. Never tell him to lie about what he wants.
- If his question is not about this chat or this advice, answer in one line and steer back to it.
- The coaching material (if any) is background strategy. Never quote it or mention coaches, books or videos.`;

type Turn = { role: "user" | "ai"; text: string };

export async function POST(req: NextRequest) {
  let body: {
    kind?: "read" | "next_move";
    insight?: string;
    context?: { her_message?: string; mode?: string; stage?: string };
    history?: Array<{ sender: "her" | "him"; text: string }>;
    thread?: Turn[];
    question?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const question = (body.question ?? "").trim().slice(0, MAX_QUESTION);
  const insight = (body.insight ?? "").trim().slice(0, 800);
  if (!question || !insight) {
    return NextResponse.json({ error: "Ask a question about this insight." }, { status: 400 });
  }
  const kind = body.kind === "next_move" ? "next_move" : "read";
  const herMessage = (body.context?.her_message ?? "").slice(0, 600);
  const mode = (body.context?.mode ?? "").slice(0, 24);
  const stage = (body.context?.stage ?? "").slice(0, 24);
  const history = (body.history ?? [])
    .filter((t) => (t.sender === "her" || t.sender === "him") && typeof t.text === "string")
    .slice(-12)
    .map((t) => `${t.sender === "her" ? "Her" : "Him"}: ${t.text.slice(0, 500)}`)
    .join("\n");
  const thread = (body.thread ?? [])
    .filter((t) => (t.role === "user" || t.role === "ai") && typeof t.text === "string")
    .slice(-MAX_THREAD_TURNS)
    .map((t) => ({ role: t.role, text: t.text.slice(0, 800) }));

  // Light abuse limit (per server instance, no database).
  const ip = hashIp(req);
  const now = Date.now();
  const rec = HITS.get(ip);
  if (!rec || now - rec.start > 3_600_000) HITS.set(ip, { start: now, n: 1 });
  else if (++rec.n > PER_IP_PER_HOUR) {
    return NextResponse.json({ error: "You've asked a lot of questions. Try again in a little while." }, { status: 429 });
  }
  if (HITS.size > 5000) HITS.clear();

  // Coaching lookup, but never let it hold up the answer.
  let material = "";
  try {
    const pool = await Promise.race([
      fetchCandidatePool(`${insight} ${question}`.slice(0, 500), 4),
      new Promise<null>((r) => setTimeout(() => r(null), RETRIEVAL_BUDGET_MS)),
    ]);
    if (pool) {
      material = rankPool(pool, 3, 0.5)
        .map((c, i) => `(${i + 1}) ${c.chunkText.slice(0, 600)}`)
        .join("\n\n");
    }
  } catch (err) {
    console.error("[beta-insight] retrieval failed (continuing):", err);
  }

  const prompt = [
    `THE INSIGHT HE IS ASKING ABOUT (${kind === "next_move" ? "next move" : mode === "opener" ? "what to lead with" : "what she is saying"}):\n${insight}`,
    history ? `THE CHAT SO FAR:\n${history}` : "",
    herMessage ? `HER LAST MESSAGE / PROFILE SUMMARY: ${herMessage}` : "",
    stage ? `STAGE: ${stage}` : "",
    thread.length
      ? `EARLIER QUESTIONS ABOUT THIS SAME INSIGHT:\n${thread.map((t) => `${t.role === "user" ? "He asked" : "You answered"}: ${t.text}`).join("\n")}`
      : "",
    `HIS QUESTION NOW: ${question}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await ai.models.generateContentStream({
          model: MODEL,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            systemInstruction: material ? `${SYSTEM}\n\nCOACHING MATERIAL (background only):\n${material}` : SYSTEM,
            temperature: 0.7,
            maxOutputTokens: 400,
          },
        });
        for await (const part of res) {
          if (part.text) controller.enqueue(encoder.encode(part.text));
        }
      } catch (err) {
        console.error("[beta-insight] failed:", err);
        controller.enqueue(encoder.encode("\n[Sorry, I couldn't answer that. Please try again.]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}