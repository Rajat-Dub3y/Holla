import { db } from "@/lib/db";
import { ragChunks } from "@/lib/Schema";
import { sql } from "drizzle-orm";
import { embedText } from "@/lib/rag/embeddings";

function toPgVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export type RetrievedChunk = {
  id: string;
  coachName: string;
  chunkText: string;
  similarity: number;
  /** Situation tags, when the chunk has been tagged. */
  situations?: string[] | null;
};

/**
 * Embeds the query text and returns the top-k most similar coaching
 * principle chunks across all ingested sources, ranked by cosine similarity
 * (1 - cosine distance, so higher = more similar). Used to ground the
 * coaching prompt in actual extracted principles rather than the model's
 * unguided training knowledge.
 */
export type CandidatePool = RetrievedChunk[];

const POOL_CACHE_MAX = 250;
const POOL_CACHE_TTL_MS = 10 * 60 * 1000;
const poolCache = new Map<string, { value: CandidatePool; expiresAt: number }>();
const poolInFlight = new Map<string, Promise<CandidatePool>>();

/**
 * Step A of retrieval: embed the query and pull a wide candidate pool from
 * pgvector. This is the slow part (network + DB), so callers can start it
 * early, in parallel with other work, and rank it later with rankPool().
 */
export async function fetchCandidatePool(queryText: string, topK: number = 5): Promise<CandidatePool> {
  const cacheKey = `${topK}:${queryText.trim().toLowerCase()}`;
  const cached = poolCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) poolCache.delete(cacheKey);

  const existing = poolInFlight.get(cacheKey);
  if (existing) return existing;

  const pending = fetchCandidatePoolUncached(queryText, topK).then((value) => {
    poolCache.set(cacheKey, { value, expiresAt: Date.now() + POOL_CACHE_TTL_MS });
    if (poolCache.size > POOL_CACHE_MAX) poolCache.delete(poolCache.keys().next().value as string);
    return value;
  }).finally(() => {
    poolInFlight.delete(cacheKey);
  });
  poolInFlight.set(cacheKey, pending);
  return pending;
}

async function fetchCandidatePoolUncached(queryText: string, topK: number): Promise<CandidatePool> {
  const queryEmbedding = await embedText(queryText);
  const vectorLiteral = toPgVectorLiteral(queryEmbedding);

  // pgvector's `<=>` is cosine DISTANCE (0 = identical), so similarity = 1 - distance.
  // A wider pool than topK lets us re-rank for balance (no single coach fills
  // every slot) and for situation tags.
  const CANDIDATES = Math.max(topK * 3, 16);
  const results = await db
    .select({
      id: ragChunks.id,
      coachName: ragChunks.coachName,
      chunkText: ragChunks.chunkText,
      situations: ragChunks.situations,
      distance: sql<number>`${ragChunks.embedding} <=> ${vectorLiteral}::vector`,
    })
    .from(ragChunks)
    .orderBy(sql`${ragChunks.embedding} <=> ${vectorLiteral}::vector`)
    .limit(CANDIDATES);

  return results.map((r) => ({
    id: r.id,
    coachName: r.coachName,
    chunkText: r.chunkText,
    situations: r.situations,
    similarity: 1 - r.distance,
  }));
}

/** Step B: in-memory re-rank (similarity + summary boost + situation tags), balance per coach. No network. */
export function rankPool(
  pool: CandidatePool,
  topK: number = 5,
  minSimilarity: number = 0.5,
  opts: { situations?: string[] } = {},
): RetrievedChunk[] {
  const SUMMARY_LABEL = "Holla Playbook"; // our curated summaries
  const SUMMARY_BOOST = 0.04; // curated, cleaner text wins close calls
  const MAX_PER_COACH = 2;
  const TAG_BOOST = 0.05; // chunk is tagged for this situation
  const TAG_BOOST_MAX = 0.08;
  const OFF_TOPIC_PENALTY = 0.1; // not about texting at all
  const wanted = new Set(opts.situations ?? []);

  const score = (c: RetrievedChunk): number => {
    let s = c.similarity + (c.coachName === SUMMARY_LABEL ? SUMMARY_BOOST : 0);
    const tags = c.situations ?? [];
    if (tags.includes("off_topic")) s -= OFF_TOPIC_PENALTY;
    if (wanted.size) {
      const hits = tags.filter((t) => wanted.has(t)).length;
      s += Math.min(hits * TAG_BOOST, TAG_BOOST_MAX);
    }
    return s;
  };

  const ranked = pool.filter((r) => r.similarity >= minSimilarity).sort((a, b) => score(b) - score(a));

  const perCoach = new Map<string, number>();
  const picked: RetrievedChunk[] = [];
  for (const chunk of ranked) {
    const used = perCoach.get(chunk.coachName) ?? 0;
    const cap = chunk.coachName === SUMMARY_LABEL ? MAX_PER_COACH + 1 : MAX_PER_COACH;
    if (used >= cap) continue;
    perCoach.set(chunk.coachName, used + 1);
    picked.push(chunk);
    if (picked.length === topK) break;
  }
  return picked;
}

/**
 * Embeds the query and returns the top-k most relevant coaching chunks.
 * (Relevant chunks score ~0.63-0.74 and off-topic ~0.42, so minSimilarity 0.5
 * drops irrelevant matches.) Same behaviour as before; now built from the two
 * steps above so the beta pipeline can run step A early.
 */
export async function retrieveRelevantChunks(
  queryText: string,
  topK: number = 5,
  minSimilarity: number = 0.5,
  opts: { situations?: string[] } = {},
): Promise<RetrievedChunk[]> {
  const pool = await fetchCandidatePool(queryText, topK);
  return rankPool(pool, topK, minSimilarity, opts);
}

/**
 * Formats retrieved chunks into a block suitable for interpolating directly
 * into the coaching system prompt.
 */
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";

  return chunks
    .map((c) => `[${c.coachName}]: ${c.chunkText}`)
    .join("\n\n");
}