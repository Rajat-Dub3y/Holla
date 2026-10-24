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
  // Run scripts/check-channels.ts first and confirm every handle is the right channel.
  // 40 newest videos each keeps the first run fast and free. Raise later.
  { coachName: "Corey Wayne", channel: "@CoachCoreyWayne", maxVideos: 40 },
  { coachName: "Apollonia Ponti", channel: "@ApolloniaPonti", maxVideos: 40 },
  { coachName: "Tripp Kramer", channel: "@TrippAdvice", maxVideos: 40 },
  { coachName: "Marni Kinrys", channel: "@marnikinrys", maxVideos: 40 },
  { coachName: "Todd Valentine", channel: "@ToddVDating", maxVideos: 40 },
  { coachName: "Damona Hoffman", channel: "@DamonaHoffman", maxVideos: 40 },

  // ON HOLD until Alexander decides: heavy on frame control / pickup-style
  // tactics, which conflicts with the brief's "no manipulation" rule.
  // { coachName: "Alexander Grace", channel: "@AlexanderGrace", maxVideos: 40 },
  // { coachName: "James Marshall", channel: "@thenaturallifestyles", maxVideos: 40 },
  // { coachName: "Mark Sing", channel: "@TheUnapologeticManPodcast", maxVideos: 40 },
  // { coachName: "Casey Zander", channel: "@CaseyZander", maxVideos: 40 },
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

  // Quota-aware loop. If Gemini's quota runs out, the ingest stops cleanly and
  // everything finished so far is kept. With --auto-resume this script then
  // sleeps until the daily quota resets (midnight US Pacific) and carries on by
  // itself, as long as this window stays open and the PC stays awake.
  // Without the flag it just stops; run it again later and it resumes.
  const autoResume = process.argv.includes("--auto-resume");
  while (true) {
    const result = await processPendingSources();
    if (!result.stoppedForQuota || !autoResume) break;
    const waitMs = msUntilPacificMidnight() + 10 * 60 * 1000; // +10 min margin
    const resumeAt = new Date(Date.now() + waitMs);
    console.log(
      `Quota used up. Sleeping until ${resumeAt.toLocaleString()} (your local time), then resuming...`,
    );
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

function msUntilPacificMidnight(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const hour = get("hour") % 24;
  const secondsIntoDay = hour * 3600 + get("minute") * 60 + get("second");
  return (86400 - secondsIntoDay) * 1000;
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