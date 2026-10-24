import { YoutubeTranscript } from "youtube-transcript";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { ragSources, ragChunks } from "@/lib/schema";
import { eq, isNull } from "drizzle-orm";
import { chunkText } from "@/lib/rag/chunk";
import { embedTextBatch, QuotaExhaustedError } from "@/lib/rag/embeddings";
import { fetchChannelVideoUrls } from "@/lib/rag/youtube-channel";

async function fetchYoutubeTranscript(videoUrl: string): Promise<string> {
  const transcriptSegments = await YoutubeTranscript.fetchTranscript(videoUrl);
  return transcriptSegments.map((seg) => seg.text).join(" ");
}

async function fetchBlogText(blogUrl: string): Promise<string> {
  const res = await fetch(blogUrl);
  const html = await res.text();
  const $ = cheerio.load(html);

  // Strip obviously non-content elements before extracting text — a naive
  // full-page text grab pulls in nav links, footers, etc. that would pollute
  // the embeddings with noise.
  $("script, style, nav, header, footer, aside").remove();

  // Prefer <article> or <main> if the page has one; fall back to <body>.
  const container = $("article").length
    ? $("article")
    : $("main").length
    ? $("main")
    : $("body");

  return container
    .find("p")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Registers a new source to be ingested later — does NOT fetch/process
 * anything yet, just creates the rag_sources row with processedAt left
 * null. Run processPendingSources() (or the scheduled ingestion job) to
 * actually fetch, chunk, and embed it.
 *
 * Idempotent: if a source with the same URL already exists, it's skipped.
 * That matters now that channel-level registration can add hundreds of
 * URLs per run — re-running the script must not create duplicates.
 */
export async function registerSource(params: {
  coachName: string;
  sourceType: "youtube" | "blog";
  sourceUrl: string;
}): Promise<boolean> {
  const existing = await db.query.ragSources.findFirst({
    where: eq(ragSources.sourceUrl, params.sourceUrl),
  });
  if (existing) return false;

  await db.insert(ragSources).values(params);
  return true;
}

/**
 * Registers a hand-written (or author-published) summary of a book/course.
 * The text is stored directly — nothing gets fetched. Use ONLY for text you
 * wrote yourself in your own words, or that the author themselves published
 * publicly (e.g. a "key ideas" page on their own site). Do NOT paste in
 * third-party commercial summaries (Blinkist, Shortform, etc.) or book text.
 */
export async function registerSummary(params: {
  coachName: string;
  title: string; // e.g. "Book Title — key principles"
  text: string;
}): Promise<boolean> {
  // rag_sources.source_url is NOT NULL, so summaries get a stable synthetic
  // key — also what makes re-running idempotent.
  const slug = params.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const syntheticUrl = `summary://${params.coachName.toLowerCase().replace(/\s+/g, "-")}/${slug}`;

  const existing = await db.query.ragSources.findFirst({
    where: eq(ragSources.sourceUrl, syntheticUrl),
  });
  if (existing) return false;

  await db.insert(ragSources).values({
    coachName: params.coachName,
    sourceType: "summary",
    sourceUrl: syntheticUrl,
    rawText: params.text,
  });
  return true;
}

/**
 * Registers every video from a YouTube channel (newest first, up to
 * maxVideos) as a pending source for the given coach. Needs
 * YOUTUBE_DATA_API_KEY. Returns how many NEW videos were registered.
 */
export async function registerChannel(params: {
  coachName: string;
  channel: string; // "@handle" or a channel ID starting with "UC"
  maxVideos?: number;
}): Promise<number> {
  const urls = await fetchChannelVideoUrls(params.channel, params.maxVideos ?? 100);

  let added = 0;
  for (const sourceUrl of urls) {
    const wasNew = await registerSource({
      coachName: params.coachName,
      sourceType: "youtube",
      sourceUrl,
    });
    if (wasNew) added++;
  }

  console.log(`[${params.coachName}] ${urls.length} videos found, ${added} new.`);
  return added;
}

/**
 * Processes every rag_sources row that hasn't been ingested yet. Safe to
 * run repeatedly (e.g. on a schedule) — already-processed sources are
 * skipped via the processedAt IS NULL filter, so re-running this doesn't
 * create duplicate chunks.
 */
export type IngestResult = {
  processed: number;
  failed: number;
  remaining: number;
  stoppedForQuota: boolean;
};

export async function processPendingSources(): Promise<IngestResult> {
  const unprocessed = await db.query.ragSources.findMany({
    where: isNull(ragSources.processedAt),
  });

  // Order matters when a daily quota can stop the run: hand-written summaries
  // go first (most value per quota unit), then videos round-robin across
  // coaches so one coach's channel can't use up the whole day's quota.
  const summaries = unprocessed.filter((s) => s.sourceType === "summary");
  const byCoach = new Map<string, typeof unprocessed>();
  for (const s of unprocessed.filter((s) => s.sourceType !== "summary")) {
    byCoach.set(s.coachName, [...(byCoach.get(s.coachName) ?? []), s]);
  }
  const interleaved: typeof unprocessed = [];
  for (let i = 0; ; i++) {
    let added = false;
    for (const list of byCoach.values()) {
      if (list[i]) {
        interleaved.push(list[i]);
        added = true;
      }
    }
    if (!added) break;
  }
  const pending = [...summaries, ...interleaved];

  console.log(`Found ${pending.length} pending source(s) to ingest.`);
  let processed = 0;
  let failed = 0;
  let stoppedForQuota = false;

  for (const source of pending) {
    try {
      console.log(`Ingesting [${source.coachName}] ${source.sourceUrl}...`);

      // Summaries already carry their text (stored at registration) — only
      // youtube/blog sources need a network fetch.
      const rawText =
        source.sourceType === "summary"
          ? (source.rawText ?? "")
          : source.sourceType === "youtube"
          ? await fetchYoutubeTranscript(source.sourceUrl)
          : await fetchBlogText(source.sourceUrl);

      // YouTube Shorts and tiny clips give 1-2 thin chunks that add noise and burn
      // embedding quota. Skip them (mark done) unless it's a hand-written summary.
      const MIN_TRANSCRIPT_CHARS = Number(process.env.RAG_MIN_TRANSCRIPT_CHARS ?? 1500);
      if (source.sourceType === "youtube" && rawText.trim().length < MIN_TRANSCRIPT_CHARS) {
        console.log(`  Too short (${rawText.trim().length} chars, likely a Short) — skipped.`);
        await db.update(ragSources).set({ processedAt: new Date() }).where(eq(ragSources.id, source.id));
        continue;
      }

      if (!rawText.trim()) {
        // Nothing to embed (e.g. no captions). Mark done so it isn't retried every run.
        console.warn(`No text extracted from ${source.sourceUrl} — marking as done.`);
        await db.update(ragSources).set({ processedAt: new Date() }).where(eq(ragSources.id, source.id));
        continue;
      }

      const chunks = chunkText(rawText);
      const embeddings = await embedTextBatch(chunks);

      // Insert in batches — a long video can produce hundreds of chunks,
      // and one giant INSERT statement risks hitting query-size limits.
      // Clear any partial chunks from an earlier interrupted attempt so a retry never duplicates.
      await db.delete(ragChunks).where(eq(ragChunks.sourceId, source.id));
      const INSERT_BATCH_SIZE = 100;
      for (let i = 0; i < chunks.length; i += INSERT_BATCH_SIZE) {
        await db.insert(ragChunks).values(
          chunks.slice(i, i + INSERT_BATCH_SIZE).map((chunkTextValue, j) => ({
            sourceId: source.id,
            coachName: source.coachName,
            chunkText: chunkTextValue,
            embedding: embeddings[i + j],
          })),
        );
      }

      await db
        .update(ragSources)
        .set({ rawText, processedAt: new Date() })
        .where(eq(ragSources.id, source.id));

      console.log(`  → ${chunks.length} chunks embedded and stored.`);
      processed++;
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        // Stop the whole run. This source stays pending; nothing is lost.
        console.warn(`\nStopped: ${err.message} Re-run later and it resumes from this source.`);
        stoppedForQuota = true;
        break;
      }
      failed++;
      // Don't let one bad source (a video with captions disabled, a blog
      // that blocks scraping, etc.) abort the whole ingestion run.
      console.error(`Failed to ingest ${source.sourceUrl}:`, err);
    }
  }

  const remaining = (
    await db.query.ragSources.findMany({ where: isNull(ragSources.processedAt) })
  ).length;
  console.log(`Done this run: ${processed} ingested, ${failed} failed, ${remaining} still pending.`);
  return { processed, failed, remaining, stoppedForQuota };
}