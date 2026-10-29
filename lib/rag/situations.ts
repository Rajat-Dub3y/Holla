/**
 * Situation tags for knowledge-base chunks.
 * A chunk can carry several. Retrieval boosts chunks whose tags match the
 * situation Step 1 detected, and demotes chunks tagged "off_topic".
 */
export const SITUATION_TAGS = [
  "opener", // first message to a match, using her profile
  "first_reply", // she messaged first / just matched, low-effort hey
  "low_effort", // short, vague or dry replies ("lol", "yeah", "good thanks")
  "she_asked_question", // answering a question she asked
  "she_shared", // she shared something about herself, build rapport
  "teasing_test", // she teases or tests him
  "build_rapport", // general conversation and rapport building
  "ask_her_out", // moving the chat to a date, specific plan
  "vague_about_meeting", // "maybe sometime", "busy", flaky or hesitant
  "going_cold", // she stopped replying, replies shrinking, follow-ups
  "general_principle", // mindset or principles that apply to any chat
  "off_topic", // not about texting or messaging (in-person approach, fitness, style, etc.)
] as const;

export type SituationTag = (typeof SITUATION_TAGS)[number];

type U = {
  mode: string;
  stage: string;
  her_action: string;
  interest: string;
};

/** Maps what Step 1 understood to the situation tags worth boosting. */
export function tagsForUnderstanding(u: U): SituationTag[] {
  const t = new Set<SituationTag>();
  if (u.mode === "opener") t.add("opener");
  if (u.mode === "follow_up" || u.stage === "going_cold") t.add("going_cold");
  if (u.stage === "just_matched" && u.mode === "reply") t.add("first_reply");
  if (u.stage === "date_ready") t.add("ask_her_out");
  switch (u.her_action) {
    case "vague":
      t.add("low_effort");
      break;
    case "question":
      t.add("she_asked_question");
      break;
    case "statement":
    case "compliment":
      t.add("she_shared");
      break;
    case "test":
      t.add("teasing_test");
      break;
    case "logistics":
      t.add("vague_about_meeting");
      t.add("ask_her_out");
      break;
  }
  if (u.interest === "low") t.add("low_effort");
  if (t.size === 0) t.add("build_rapport");
  return [...t];
}