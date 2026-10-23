import { YoutubeTranscript } from "youtube-transcript";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { ragSources, ragChunks } from "@/lib/Schema";
import { eq, isNull } from "drizzle-orm";
import { chunkText } from "@/lib/rag/chunk";
import { embedTextBatch } from "@/lib/rag/embeddings";
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
export async function processPendingSources() {
  const pending = await db.query.ragSources.findMany({
    where: isNull(ragSources.processedAt),
  });

  console.log(`Found ${pending.length} pending source(s) to ingest.`);

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

      if (!rawText.trim()) {
        console.warn(`No text extracted from ${source.sourceUrl} — skipping.`);
        continue;
      }

      const chunks = chunkText(rawText);
      const embeddings = await embedTextBatch(chunks);

      // Insert in batches — a long video can produce hundreds of chunks,
      // and one giant INSERT statement risks hitting query-size limits.
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
    } catch (err) {
      // Don't let one bad source (a video with captions disabled, a blog
      // that blocks scraping, etc.) abort the whole ingestion run.
      console.error(`Failed to ingest ${source.sourceUrl}:`, err);
    }
  }
}