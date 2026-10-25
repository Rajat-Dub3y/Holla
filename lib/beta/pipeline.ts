import { GoogleGenAI, Type } from "@google/genai";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
const MODEL = "gemini-2.5-flash-lite";

// ─────────────────────────────────────────────────────────
// Types (match Part 4 of the beta brief)
// ─────────────────────────────────────────────────────────
export type Mode = "opener" | "reply" | "follow_up" | "fix_my_text";
export type Style = "playful" | "curious" | "assertive" | "warm";

export type BetaImage = { mimeType: string; data: string }; // base64, no data: prefix
export type HistoryTurn = { sender: "her" | "him"; text: string };

export type BetaInput = {
  /** What the user picked on the tab. The AI may override it and says so. */
  requestedMode: "reply" | "opener";
  text?: string;
  images?: BetaImage[];
  history?: HistoryTurn[];
  /** A one-tap correction, e.g. "The grey bubbles are her". */
  hint?: string;
};

type Understanding = {
  input_type: "screenshot" | "her_text" | "jack_describing" | "chat_log" | "jack_draft" | "profile";
  source_app: "hinge" | "bumble" | "tinder" | "imessage" | "whatsapp" | "instagram" | "notes" | "unknown";
  mode: Mode;
  stage: "just_matched" | "early_rapport" | "building" | "date_ready" | "going_cold";
  her_message: string;
  last_sender: "her" | "him" | "none";
  conversation: Array<{ sender: "her" | "him" | "unknown"; text: string }>;
  his_draft: string;
  profile_details: string[];
  interest: "high" | "medium" | "low";
  her_action: "vague" | "statement" | "question" | "compliment" | "logistics" | "test" | "opener" | "profile" | "other";
  signals: string;
  retrieval_query: string;
  mode_note: string;
  needs_clarification: boolean;
  clarification_question: string;
  clarification_options: string[];
};

export type BetaResult = {
  input_type: Understanding["input_type"];
  source_app: Understanding["source_app"];
  mode: Mode;
  stage: Understanding["stage"];
  her_message: string;
  read: string;
  replies: Array<{ style: Style; recommended: boolean; text: string }>;
  next_move: string;
  retrieved_sources: Array<{ id: string; coach: string; similarity: number }>;
  mode_note?: string;
  clarify?: { question: string; options: string[] };
  /** Step-1 output, logged for debugging. Never contains screenshots. */
  understanding: Understanding;
};

// ─────────────────────────────────────────────────────────
// Step 1: understand what came in (vision + text), mode, stage, signal
// ─────────────────────────────────────────────────────────
const UNDERSTAND_SYSTEM = `You read dating-app conversations for a coach. You do NOT write replies here, you only work out what is going on.

"Jack" is the user. "Her" is the woman he is talking to.

1. INPUT. Work out what came in:
- screenshot: read ALL text in the image(s). Work out the app (Hinge, Bumble, Tinder, iMessage, WhatsApp, Instagram DM, Notes, other) from the layout. Work out whose bubbles are whose: Jack's are usually on the right and in the app's accent colour; hers are usually on the left and grey/white. Find the LAST message and who sent it. Decide if it is a chat or a dating profile.
- Multiple screenshots may be one chat cropped across several images: read them in order.
- Ignore names, timestamps, "Seen"/"Delivered" markers as chat content (use timestamps only to notice a chat going cold). Write voice notes as "[voice note]", GIFs as "[gif]", photos as "[photo]". Do not skip them.
- text: decide if it is: her message on its own (her_text); Jack describing what she said ("she just said hey what do I say") (jack_describing); a pasted chat with both sides (chat_log); or Jack's own draft he wants improved (jack_draft).
- NEVER write her real name or any real names. Use "her" or leave names out.
- If you are genuinely unsure who sent which bubble, or who sent the last message, set needs_clarification true, ask ONE short question, and give 2 short options Jack can tap (e.g. "The grey bubbles are her" / "The blue bubbles are her"). Never guess silently when it would flip the answer.

2. MODE.
- opener: no messages yet, or a profile screenshot (profile prompts, photos, bio).
- reply: her message is the last one.
- follow_up: Jack's message is last and she has not answered.
- fix_my_text: Jack pasted his own draft and wants it improved.
If the user chose the "reply" tab but sent a profile or nothing to reply to, set mode "opener" and write mode_note as one short line, e.g. "That looks like her profile, so I wrote an opener." If they chose "opener" but sent a chat with her message last, switch to "reply" and say so in mode_note. Otherwise mode_note is "".

3. STAGE: just_matched | early_rapport | building | date_ready | going_cold.

4. HER SIGNAL: did she ask a question back? Her message length vs his? Emoji, exclamation, laughter? Did she share something about herself? Is it a test or a tease? Set interest high/medium/low and her_action (vague | statement | question | compliment | logistics | test | opener | profile | other). Summarise in "signals" in one short sentence.

5. retrieval_query: one plain-English sentence for searching a coaching knowledge base, built from stage + her signal + her actual words, e.g. "just matched, she sent a low-effort hey, he needs to lead the conversation".

6. profile_details: concrete specifics from her profile or messages he could reference (a prompt answer, a place, a pet, a hobby). Empty list if none.

her_message: the text of her most recent message (or a one-line summary of the profile). his_draft: only for fix_my_text, otherwise "".`;

const UNDERSTAND_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    input_type: { type: Type.STRING, enum: ["screenshot", "her_text", "jack_describing", "chat_log", "jack_draft", "profile"] },
    source_app: { type: Type.STRING, enum: ["hinge", "bumble", "tinder", "imessage", "whatsapp", "instagram", "notes", "unknown"] },
    mode: { type: Type.STRING, enum: ["opener", "reply", "follow_up", "fix_my_text"] },
    stage: { type: Type.STRING, enum: ["just_matched", "early_rapport", "building", "date_ready", "going_cold"] },
    her_message: { type: Type.STRING },
    last_sender: { type: Type.STRING, enum: ["her", "him", "none"] },
    conversation: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sender: { type: Type.STRING, enum: ["her", "him", "unknown"] },
          text: { type: Type.STRING },
        },
        required: ["sender", "text"],
      },
    },
    his_draft: { type: Type.STRING },
    profile_details: { type: Type.ARRAY, items: { type: Type.STRING } },
    interest: { type: Type.STRING, enum: ["high", "medium", "low"] },
    her_action: {
      type: Type.STRING,
      enum: ["vague", "statement", "question", "compliment", "logistics", "test", "opener", "profile", "other"],
    },
    signals: { type: Type.STRING },
    retrieval_query: { type: Type.STRING },
    mode_note: { type: Type.STRING },
    needs_clarification: { type: Type.BOOLEAN },
    clarification_question: { type: Type.STRING },
    clarification_options: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "input_type", "source_app", "mode", "stage", "her_message", "last_sender", "conversation",
    "his_draft", "profile_details", "interest", "her_action", "signals", "retrieval_query",
    "mode_note", "needs_clarification", "clarification_question", "clarification_options",
  ],
};

// ─────────────────────────────────────────────────────────
// Step 5-6: write the read, three replies and the next move
// ─────────────────────────────────────────────────────────
const WRITE_SYSTEM = `You are Holla, a dating conversation coach for a guy ("Jack") texting a woman on a dating app. You tell him what she is doing and give him replies that actually work and move the chat toward a date.

HOW YOU WORK
- The coaching material below sets the STRATEGY (what to do and why). You only write the words, in your own texting voice. Never quote the material, never mention coaches, books or videos.
- Give a "read": one or two short lines saying what she is doing and what that means. Plain and specific, no jargon.
- Give exactly three replies, each with a different style, and mark exactly one as recommended:
  playful: she is light, teasing, using emoji, or the chat needs energy.
  curious: she shared something real or asked a genuine question; builds rapport.
  assertive: she is vague or low effort and he needs to lead, or it is time to set up the date.
  warm: she opened up about something personal.
  Choose the recommended style that fits her signal; the other two give him a real alternative.
- Give a "next_move": one short line on where this is heading, e.g. "If she answers with a story, ask her out for a drink next." The goal is a date, then a connection.

RULES EVERY REPLY FOLLOWS
- Sounds like a real guy texting. Short: roughly her length, rarely more than two lines.
- Uses something specific she said or showed, when there is something.
- Gives her something easy and fun to answer. Not an interview: mix a statement with a question.
- Never needy, never over-complimenting, never begging for a reply, never complaining that she is short or slow.
- No crude lines, no negging, no manipulation, no pickup lines. Confident and respectful, always.
- Match her spelling and slang (US, UK, Australian). No emoji unless she uses them.
- If a reply needs a fact about Jack you were not given (his city, job, a place), write a short [placeholder] he can fill in, such as [city]. Do not invent facts about him.
- Never tell Jack to lie about what he wants. If he wants something casual, help him say it honestly and respectfully.
- Do NOT write her name.

BY MODE
- opener: never "hey", "hi how are you" or "you're beautiful". Use something specific from her profile. If there is almost nothing, give her an easy, fun choice to answer.
- reply: answer what she said in the context of the whole chat. If she asked a question, answer it with a little personality, then hand it back.
- follow_up: she has not answered. Recommend waiting OR one light, no-guilt follow-up (never "?" or "guess you're not interested"). If he already sent one follow-up, tell him to move on and make the replies a graceful, low-key option or say so in the read.
- fix_my_text: the first reply (recommended) is his draft improved. "read" is ONE line explaining what you changed and why. The other two are different angles on the same message.
- If the chat has had a few good back-and-forths and she is engaged (asks questions, longer replies, emoji), the next step is a date: make the recommended reply suggest a specific day and place or two options.
- If she is vague about meeting ("maybe sometime", "busy"), keep it light, offer one easy option, do not push.
- If her replies keep getting shorter, switch to a fresh fun topic or go straight for the date.`;

const WRITE_SCHEMA = {
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

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function historyToText(history: HistoryTurn[] = []): string {
  return history.map((t) => `${t.sender === "her" ? "Her" : "Him"}: ${t.text}`).join("\n");
}

function safeJson<T>(text: string | undefined, label: string): T {
  try {
    return JSON.parse(text ?? "{}") as T;
  } catch {
    throw new Error(`The model returned invalid JSON for ${label}.`);
  }
}

/** Ensures exactly one recommended reply and at most three replies. */
function normalizeReplies(replies: BetaResult["replies"]): BetaResult["replies"] {
  const cleaned = (replies ?? [])
    .filter((r) => r && typeof r.text === "string" && r.text.trim())
    .slice(0, 3)
    .map((r) => ({ ...r, text: r.text.trim() }));
  if (cleaned.length === 0) return [];
  const firstRec = cleaned.findIndex((r) => r.recommended);
  const idx = firstRec === -1 ? 0 : firstRec;
  const ordered = [cleaned[idx], ...cleaned.filter((_, i) => i !== idx)];
  return ordered.map((r, i) => ({ ...r, recommended: i === 0 }));
}

// ─────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────
export async function runBetaPipeline(input: BetaInput): Promise<BetaResult> {
  const hasImage = (input.images?.length ?? 0) > 0;

  // ── Step 1: understand ──
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    {
      text: [
        `User chose the "${input.requestedMode === "opener" ? "Write an opener" : "Reply to her"}" tab.`,
        input.history?.length ? `Conversation so far (from earlier in this session):\n${historyToText(input.history)}` : "",
        input.hint ? `Correction from Jack: ${input.hint}` : "",
        input.text?.trim() ? `Jack's text input:\n${input.text.trim()}` : "",
        hasImage ? `${input.images!.length} screenshot(s) attached.` : "",
        !input.text?.trim() && !hasImage ? "Nothing was sent (empty box)." : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    ...(input.images ?? []).map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
  ];

  const understandRes = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: UNDERSTAND_SYSTEM,
      responseMimeType: "application/json",
      responseSchema: UNDERSTAND_SCHEMA,
      temperature: 0.2,
    },
  });
  const u = safeJson<Understanding>(understandRes.text, "understanding");

  // Unsure who is who: ask one quick tap question instead of guessing.
  if (u.needs_clarification && u.clarification_question && u.clarification_options?.length) {
    return {
      input_type: u.input_type,
      source_app: u.source_app,
      mode: u.mode,
      stage: u.stage,
      her_message: u.her_message,
      read: "",
      replies: [],
      next_move: "",
      retrieved_sources: [],
      mode_note: u.mode_note || undefined,
      clarify: { question: u.clarification_question, options: u.clarification_options.slice(0, 3) },
      understanding: u,
    };
  }

  // ── Step 4: pull the coaching ──
  let chunks: Awaited<ReturnType<typeof retrieveRelevantChunks>> = [];
  try {
    chunks = await retrieveRelevantChunks(u.retrieval_query || u.her_message || "dating opener", 6);
  } catch (err) {
    // Never block the reply on retrieval (e.g. embedding quota). Logged in the debug fields.
    console.error("[beta] retrieval failed, continuing without it:", err);
  }

  const material = chunks.length
    ? chunks.map((c, i) => `(${i + 1}) ${c.chunkText}`).join("\n\n")
    : "(no coaching material matched; use general good judgement)";

  // ── Step 5-6: write ──
  const conversationText = u.conversation?.length
    ? u.conversation
        .map((m) => `${m.sender === "her" ? "Her" : m.sender === "him" ? "Him" : "?"}: ${m.text}`)
        .join("\n")
    : historyToText(input.history);

  const writePrompt = [
    `MODE: ${u.mode}`,
    `STAGE: ${u.stage}`,
    `HER SIGNAL: interest ${u.interest}; she is being ${u.her_action}. ${u.signals}`,
    u.mode_note ? `Note: ${u.mode_note}` : "",
    conversationText ? `CONVERSATION:\n${conversationText}` : "",
    u.her_message ? `HER LAST MESSAGE / PROFILE SUMMARY: ${u.her_message}` : "",
    u.profile_details?.length ? `SPECIFIC DETAILS TO USE: ${u.profile_details.join("; ")}` : "",
    u.mode === "fix_my_text" ? `HIS DRAFT: ${u.his_draft}` : "",
    input.hint ? `Correction from Jack: ${input.hint}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const writeRes = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: writePrompt }] }],
    config: {
      systemInstruction: `${WRITE_SYSTEM}\n\nCOACHING MATERIAL (strategy only, never quote):\n${material}`,
      responseMimeType: "application/json",
      responseSchema: WRITE_SCHEMA,
      temperature: 0.8,
    },
  });
  const w = safeJson<{ read: string; replies: BetaResult["replies"]; next_move: string }>(writeRes.text, "reply");

  const replies = normalizeReplies(w.replies);
  if (replies.length === 0) throw new Error("The model did not return any replies.");

  return {
    input_type: u.input_type,
    source_app: u.source_app,
    mode: u.mode,
    stage: u.stage,
    her_message: u.her_message,
    read: (w.read ?? "").trim(),
    replies,
    next_move: (w.next_move ?? "").trim(),
    retrieved_sources: chunks.map((c) => ({
      id: c.id,
      coach: c.coachName,
      similarity: Number(c.similarity.toFixed(3)),
    })),
    mode_note: u.mode_note || undefined,
    understanding: u,
  };
}
