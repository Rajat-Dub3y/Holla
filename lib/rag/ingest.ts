import { YoutubeTranscript } from "youtube-transcript";
import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { ragSources, ragChunks } from "@/lib/Schema";
import { eq, isNull } from "drizzle-orm";
import { chunkText } from "@/lib/rag/chunk";
import { embedTextBatch } from "@/lib/rag/embeddings";

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
 */
export async function registerSource(params: {
  coachName: string;
  sourceType: "youtube" | "blog";
  sourceUrl: string;
}) {
  await db.insert(ragSources).values(params);
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

      const rawText =
        source.sourceType === "youtube"
          ? await fetchYoutubeTranscript(source.sourceUrl)
          : await fetchBlogText(source.sourceUrl);

      if (!rawText.trim()) {
        console.warn(`No text extracted from ${source.sourceUrl} — skipping.`);
        continue;
      }

      const chunks = chunkText(rawText);
      const embeddings = await embedTextBatch(chunks);

      await db.insert(ragChunks).values(
        chunks.map((chunkTextValue, i) => ({
          sourceId: source.id,
          coachName: source.coachName,
          chunkText: chunkTextValue,
          embedding: embeddings[i],
        })),
      );

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