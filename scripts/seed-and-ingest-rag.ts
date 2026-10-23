import {
  registerSource,
  registerSummary,
  registerChannel,
  processPendingSources,
} from "@/lib/rag/ingest";
import { HOLLA_SUMMARIES } from "./rag-summaries";

/**
 * Fill in the three lists below with REAL, verified sources. I deliberately
 * left them empty — I can't confirm a given channel handle, article, or
 * video is real, current, and actually the right content, and a wrong
 * entry means bad data in your coaching engine.
 *
 * Run (loads .env.local):
 *   npx tsx --env-file=.env.local scripts/seed-and-ingest-rag.ts
 *
 * Safe to re-run: already-registered sources are skipped, already-processed
 * ones aren't re-embedded.
 */

// 1. WHOLE CHANNELS — every video (newest first, up to maxVideos).
//    Needs YOUTUBE_DATA_API_KEY in .env.local.
const CHANNELS: Array<{ coachName: string; channel: string; maxVideos?: number }> = [
  // { coachName: "Matthew Hussey", channel: "@mattyhussey", maxVideos: 150 },
];

// 2. INDIVIDUAL URLs — one-off videos or articles/blog posts.
const INDIVIDUAL_SOURCES: Array<{
  coachName: string;
  sourceType: "youtube" | "blog";
  sourceUrl: string;
}> = [
  // { coachName: "Amy North", sourceType: "blog", sourceUrl: "https://..." },
];

// 3. SUMMARIES — book/course key ideas, written by YOU in your own words,
//    or published by the author themselves. NEVER paste book text, and
//    never paste third-party commercial summaries (Blinkist, Shortform...).
//    Aim for 300-1500 words per summary: a list of the core principles,
//    each with a sentence or two on what it means in practice.
const SUMMARIES: Array<{ coachName: string; title: string; text: string }> = [
  ...HOLLA_SUMMARIES,
  // {
  //   coachName: "Corey Wayne",
  //   title: "How to Be a 3% Man — key principles",
  //   text: `Principle 1: ...\n\nPrinciple 2: ...`,
  // },
];

async function main() {
  const total = CHANNELS.length + INDIVIDUAL_SOURCES.length + SUMMARIES.length;
  if (total === 0) {
    console.warn("All source lists are empty — fill in real sources in this file first.");
    return;
  }

  for (const c of CHANNELS) await registerChannel(c);
  for (const s of INDIVIDUAL_SOURCES) await registerSource(s);
  for (const s of SUMMARIES) await registerSummary(s);

  await processPendingSources();
}

main()
  .then(() => {
    console.log("RAG ingestion run complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("RAG ingestion run failed:", err);
    process.exit(1);
  });