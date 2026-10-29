/**
 * Times Gemini with a call shaped like the real beta pipeline (long system
 * prompt + structured JSON output), under different thinking settings.
 *
 *   npx tsx --env-file=.env.local scripts/latency-test.ts
 *   (optional)  MODEL=your-model-id npx tsx ...   (PowerShell: $env:MODEL="..."; npx tsx ...)
 *
 * Set MODEL below (or via env) to the same model id your pipeline.ts uses.
 */
import { GoogleGenAI, Type } from "@google/genai";

const MODEL = process.env.MODEL ?? "gemini-3.5-flash-lite";
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

const RULES = `You are Holla, a dating conversation coach for a guy texting a woman on a dating app. Give a short "read" of what she is doing, exactly three replies in different styles (playful, curious, assertive, warm), mark one recommended, and a next_move. Replies sound like a real guy texting: short, specific, easy to answer, never needy, never crude. `.repeat(8);
const MATERIAL = "Coaching material: when she sends a low-effort message, lead the conversation with a light, fun question that is easy to answer. ".repeat(30);

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    read: { type: Type.STRING },
    replies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          style: { type: Type.STRING, enum: ["playful", "curious", "assertive", "warm"] },
          recommended: { type: Type.BOOLEAN },
          text: { type: Type.STRING },
        },
        required: ["style", "recommended", "text"],
      },
    },
    next_move: { type: Type.STRING },
  },
  required: ["read", "replies", "next_move"],
};

async function run(label: string, thinking?: Record<string, unknown>, structured = true) {
  const t0 = Date.now();
  let first = 0;
  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: "MODE: reply\nSTAGE: just_matched\nHER LAST MESSAGE: hey" }] }],
      config: {
        systemInstruction: `${RULES}\n\n${MATERIAL}`,
        ...(structured ? { responseMimeType: "application/json", responseSchema: SCHEMA } : {}),
        temperature: 0.8,
        ...(thinking ? { thinkingConfig: thinking } : {}),
      },
    });
    let usage: any;
    for await (const part of stream) {
      if (!first) first = Date.now() - t0;
      usage = part.usageMetadata ?? usage;
    }
    console.log(
      `${label.padEnd(30)} total ${String(Date.now() - t0).padStart(6)} ms | first text ${String(first).padStart(6)} ms | in=${usage?.promptTokenCount} out=${usage?.candidatesTokenCount} thinking=${usage?.thoughtsTokenCount ?? 0}`,
    );
  } catch (err) {
    console.log(`${label.padEnd(30)} ERROR ${String((err as Error).message).slice(0, 110)}`);
  }
}

async function main() {
  console.log(`Model: ${MODEL}\n`);
  await run("default (as in the app)");
  await run("default again");
  await run("thinkingLevel minimal", { thinkingLevel: "minimal" });
  await run("thinkingLevel low", { thinkingLevel: "low" });
  await run("thinkingBudget 0", { thinkingBudget: 0 });
  await run("no schema (plain text)", undefined, false);
}

main().then(() => process.exit(0));