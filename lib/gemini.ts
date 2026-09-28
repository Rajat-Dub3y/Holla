import { GoogleGenAI, Type } from "@google/genai";
import { retrieveRelevantChunks, formatChunksForPrompt } from "@/lib/rag/retrieve";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

const MODEL = "gemini-2.5-flash-lite";

// Structured output schema — forces Gemini to return exactly this shape
// rather than freeform text we'd have to parse and hope matches.
const ANALYZE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    insight: {
      type: Type.STRING,
      description:
        "One short, specific observation about her message — what it signals (engagement, effort level, a question, etc.). Never generic. Max ~20 words.",
    },
    nextStepPrompt: {
      type: Type.STRING,
      description:
        "One grounded, specific suggestion for what he could say next, referencing the actual content of her message. Never a generic staged prompt like 'time to escalate.' Max ~25 words.",
    },
  },
  required: ["insight", "nextStepPrompt"],
};

// RAG-retrieved coach-principle chunks are interpolated below the voice
// rules, in a clearly separated block — kept distinct from the voice/format
// rules above so the model treats retrieved material as reference context,
// not as instructions to follow verbatim.
const SYSTEM_PROMPT = `You are a dating conversation coach. Your voice is
"smart friend, not guru": direct, warm, specific, a little funny — never
preachy, never clinical, never macho.

Never use these words: rizz, alpha, high-value man, dominance, seduce, hack
women, close, game, simp, sigma, female psychology, irresistible, make her
chase.

You read a real conversation between the user (referred to as "he") and his
match (referred to as "she"), in the context of the full thread so far — the
same message can mean something different early in a conversation versus
late in one, so always weigh recency and pattern, not just the message in
isolation.

Never suggest a rigid staged sequence (opener → warm-up → escalate → ask
out). Real conversations don't move in fixed stages — ground every
suggestion in the actual content of her most recent message.`;

function buildSystemPromptWithRagContext(ragContext: string): string {
  if (!ragContext) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\nReference material from real dating coaches (use as grounding for your reasoning — do not quote it directly, do not name-drop the coach, just let it inform the advice):\n${ragContext}`;
}

export type ThreadMessageForPrompt = {
  sender: "user" | "match";
  content: string;
};

export type PersonaContext = {
  communicationStyle?: string | null;
  focusArea?: string | null;
  coachingTone?: string;
};

export type AnalyzeResult = {
  insight: string;
  nextStepPrompt: string;
};

/**
 * Analyzes her newest message in the context of the thread so far and
 * returns a structured insight + next-step prompt. Accepts either plain
 * text (pasted/typed) or a screenshot image — Gemini reads the screenshot
 * directly, no separate OCR step needed.
 */
export async function analyzeIncomingMessage(params: {
  threadHistory: ThreadMessageForPrompt[];
  newMessage: { type: "text"; content: string } | { type: "screenshot"; imageBase64: string; mimeType: string };
  persona?: PersonaContext;
}): Promise<AnalyzeResult> {
  const { threadHistory, newMessage, persona } = params;

  const historyText = threadHistory
    .map((m) => `${m.sender === "user" ? "Him" : "Her"}: ${m.content}`)
    .join("\n");

  const personaLine = persona
    ? `User's coaching tone preference: ${persona.coachingTone ?? "balanced"}. Communication style: ${persona.communicationStyle ?? "unspecified"}. Current focus: ${persona.focusArea ?? "unspecified"}.`
    : "";

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    {
      text: `${personaLine}\n\nConversation so far:\n${historyText}\n\nHer newest message${
        newMessage.type === "screenshot" ? " (see attached screenshot)" : ""
      }:${newMessage.type === "text" ? ` ${newMessage.content}` : ""}`,
    },
  ];

  if (newMessage.type === "screenshot") {
    parts.push({
      inlineData: {
        mimeType: newMessage.mimeType,
        data: newMessage.imageBase64,
      },
    });
  }

  // Retrieval query: her actual new text if we have it, otherwise fall back
  // to the last few lines of thread history — a screenshot has no text to
  // embed directly, but the surrounding conversation still gives retrieval
  // something relevant to match against.
  const retrievalQuery =
    newMessage.type === "text"
      ? newMessage.content
      : threadHistory.slice(-3).map((m) => m.content).join(" ");

  let ragContext = "";
  try {
    const chunks = await retrieveRelevantChunks(retrievalQuery);
    ragContext = formatChunksForPrompt(chunks);
  } catch (err) {
    // RAG retrieval failing (empty rag_chunks table, embedding call error,
    // etc.) should never block the core coaching loop — fall back to no
    // retrieved context rather than throwing.
    console.error("RAG retrieval failed, proceeding without it:", err);
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: buildSystemPromptWithRagContext(ragContext),
      responseMimeType: "application/json",
      responseSchema: ANALYZE_RESPONSE_SCHEMA,
    },
  });

  const parsed = JSON.parse(response.text ?? "{}");
  return parsed as AnalyzeResult;
}

/**
 * Light, Grammarly-style feedback on his draft reply — not a rewrite, just
 * a short flag ("this might come across as too eager") or affirmation
 * ("good, this keeps it light"). Called while/after he types, before send.
 * Not separately metered — bundled into the credit already spent on her
 * incoming message per the MVP spec's metering section.
 */
export async function getDraftFeedback(params: {
  threadHistory: ThreadMessageForPrompt[];
  draftText: string;
  persona?: PersonaContext;
}): Promise<{ feedback: string }> {
  const { threadHistory, draftText, persona } = params;

  const historyText = threadHistory
    .map((m) => `${m.sender === "user" ? "Him" : "Her"}: ${m.content}`)
    .join("\n");

  const personaLine = persona
    ? `Communication style: ${persona.communicationStyle ?? "unspecified"}.`
    : "";

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${personaLine}\n\nConversation so far:\n${historyText}\n\nHis draft reply (not sent yet): "${draftText}"\n\nGive one short line of feedback on this draft — a gentle flag if something's off (too eager, too many questions, etc.) or a quick affirmation if it's good. Max ~15 words.`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          feedback: { type: Type.STRING, description: "One short line of feedback on the draft." },
        },
        required: ["feedback"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}");
  return parsed as { feedback: string };
}

/**
 * Short, specific encouragement after he confirms sending his message —
 * tied to his actual choice, never generic ("Nice message! 🎉"). This is
 * what separates the product from "ChatGPT with a dating skin," per the
 * MVP spec's framing of this exact moment.
 */
export async function generateEncouragementNote(params: {
  threadHistory: ThreadMessageForPrompt[];
  sentMessage: string;
  persona?: PersonaContext;
}): Promise<{ encouragement: string }> {
  const { threadHistory, sentMessage, persona } = params;

  const historyText = threadHistory
    .map((m) => `${m.sender === "user" ? "Him" : "Her"}: ${m.content}`)
    .join("\n");

  const personaLine = persona
    ? `User's coaching tone preference: ${persona.coachingTone ?? "balanced"}.`
    : "";

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${personaLine}\n\nConversation so far:\n${historyText}\n\nHe just sent: "${sentMessage}"\n\nGive one short, specific encouragement note tied to what he actually chose to say — reference the specific content/choice, never generic. Max ~20 words.`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          encouragement: { type: Type.STRING, description: "One short, specific encouragement note." },
        },
        required: ["encouragement"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}");
  return parsed as { encouragement: string };
}

/**
 * Persona practice chat — Gemini plays a simulated match with a described
 * personality, giving the user a low-stakes conversation to practice on.
 * Returns her simulated reply plus the same style of coach feedback as the
 * real Chat loop, so practice transfers directly to the real thing.
 */
export async function practiceChatTurn(params: {
  personaDescription: string;
  conversationSoFar: ThreadMessageForPrompt[];
  hisNewMessage: string;
}): Promise<{ herReply: string; coachFeedback: string }> {
  const { personaDescription, conversationSoFar, hisNewMessage } = params;

  const historyText = conversationSoFar
    .map((m) => `${m.sender === "user" ? "Him" : "Her"}: ${m.content}`)
    .join("\n");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are simulating a dating match with this personality: ${personaDescription}\n\nConversation so far:\n${historyText}\n\nHe just said: "${hisNewMessage}"\n\nRespond in character as her (natural, realistic texting style — not overly enthusiastic or robotic), then separately give one short line of coach feedback on how he did.`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          herReply: { type: Type.STRING, description: "Her simulated in-character reply." },
          coachFeedback: { type: Type.STRING, description: "One short coaching line on his message." },
        },
        required: ["herReply", "coachFeedback"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}");
  return parsed as { herReply: string; coachFeedback: string };
}

/**
 * General coaching Q&A — scoped specifically to dating/self-presentation
 * topics, not a general-purpose assistant. Still grounded with RAG context
 * where relevant, same as the main analysis loop.
 */
export async function askCoachQuestion(params: {
  question: string;
  persona?: PersonaContext;
}): Promise<{ answer: string }> {
  const { question, persona } = params;

  let ragContext = "";
  try {
    const chunks = await retrieveRelevantChunks(question);
    ragContext = formatChunksForPrompt(chunks);
  } catch (err) {
    console.error("RAG retrieval failed for Q&A, proceeding without it:", err);
  }

  const personaLine = persona
    ? `User's communication style: ${persona.communicationStyle ?? "unspecified"}.`
    : "";

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: `${personaLine}\n\nQuestion: ${question}` }],
      },
    ],
    config: {
      systemInstruction: `${buildSystemPromptWithRagContext(ragContext)}\n\nThis is general coaching Q&A, not analysis of a specific conversation — answer directly and practically. Stay scoped to dating, conversation skills, and self-presentation topics; if asked something unrelated, redirect briefly back to what you actually help with.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING, description: "A direct, practical answer." },
        },
        required: ["answer"],
      },
    },
  });

  const parsed = JSON.parse(response.text ?? "{}");
  return parsed as { answer: string };
}