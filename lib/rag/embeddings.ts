import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

// gemini-embedding-001 defaults to 3072 dims, but supports truncation to 768
// via outputDimensionality. We request 768 so it matches the vector(768)
// column already in schema.ts — no migration needed.
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

// Small in-memory cache: short inputs like "hey" or "lol" repeat constantly, and
// a cache hit saves a whole network call (~300-500 ms). Per server instance.
const EMBED_CACHE = new Map<string, number[]>();
const EMBED_CACHE_MAX = 300;

export async function embedText(text: string): Promise<number[]> {
  const key = text.trim().toLowerCase();
  const hit = EMBED_CACHE.get(key);
  if (hit) return hit;
  const values = await embedTextUncached(text);
  if (EMBED_CACHE.size >= EMBED_CACHE_MAX) EMBED_CACHE.delete(EMBED_CACHE.keys().next().value as string);
  EMBED_CACHE.set(key, values);
  return values;
}

async function embedTextUncached(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("Embedding request returned no values");
  }
  return values;
}

const BATCH_SIZE = 20; // chunks per API request — far fewer requests than one-per-chunk
// Free-tier per-minute token limits are tight for embeddings, so pace gently.
// Override with RAG_EMBED_PAUSE_MS in .env.local (e.g. 6000 if you still see 429s).
const PAUSE_BETWEEN_BATCHES_MS = Number(process.env.RAG_EMBED_PAUSE_MS ?? 3000);
const MAX_RETRIES = 6;

/**
 * Thrown when the API quota is used up (daily limit, or per-minute limit that
 * didn't clear after all retries). The ingest loop catches this, stops cleanly
 * and leaves unprocessed sources pending, so the next run resumes right there.
 */
export class QuotaExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExhaustedError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function embedBatchWithRetry(batch: string[]): Promise<number[][]> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: batch,
        config: { outputDimensionality: EMBEDDING_DIMENSIONS },
      });

      const vectors = response.embeddings?.map((e) => e.values);
      if (!vectors || vectors.length !== batch.length || vectors.some((v) => !v)) {
        throw new Error("Embedding response did not match batch size");
      }
      return vectors as number[][];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimit = /429|RESOURCE_EXHAUSTED|rate/i.test(message);
      const isRetryable = isRateLimit || /503|UNAVAILABLE/i.test(message);

      // A DAILY quota won't clear by waiting a few seconds: stop now and resume later.
      if (isRateLimit && /per ?day|daily|PerDay/i.test(message)) {
        throw new QuotaExhaustedError("Daily Gemini quota exhausted.");
      }
      if (!isRetryable) throw err;
      if (attempt === MAX_RETRIES - 1) {
        if (isRateLimit) throw new QuotaExhaustedError("Rate limit did not clear after retries.");
        throw err;
      }

      // Exponential backoff: 2s, 4s, 8s, 16s — a rate-limited retry that
      // waits is free; hammering the API just burns the quota faster.
      const waitMs = Math.min(2000 * 2 ** attempt, 60_000);
      console.warn(`  Embedding rate-limited/unavailable, retrying in ${waitMs / 1000}s...`);
      await sleep(waitMs);
    }
  }
  throw new Error("unreachable");
}

/**
 * Embeds many chunks efficiently: batches them (BATCH_SIZE per request),
 * paces the requests, and retries with backoff on rate-limit errors.
 * This is what keeps large-scale ingestion inside the free tier.
 */
export async function embedTextBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    results.push(...(await embedBatchWithRetry(batch)));
    if (i + BATCH_SIZE < texts.length) await sleep(PAUSE_BETWEEN_BATCHES_MS);
  }

  return results;
}