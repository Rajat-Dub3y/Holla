import { db } from "@/lib/db";
import { ragChunks } from "@/lib/Schema";
import { sql } from "drizzle-orm";
import { embedText } from "@/lib/rag/embeddings";

function toPgVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export type RetrievedChunk = {
  coachName: string;
  chunkText: string;
  similarity: number;
};

/**
 * Embeds the query text and returns the top-k most similar coaching
 * principle chunks across all ingested sources, ranked by cosine similarity
 * (1 - cosine distance, so higher = more similar). Used to ground the
 * coaching prompt in actual extracted principles rather than the model's
 * unguided training knowledge.
 */
export async function retrieveRelevantChunks(
  queryText: string,
  topK: number = 5,
  // Test run showed relevant chunks score ~0.63-0.74 and off-topic ~0.42,
  // so 0.5 drops irrelevant matches instead of stuffing them into the prompt.
  minSimilarity: number = 0.5,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(queryText);
  const vectorLiteral = toPgVectorLiteral(queryEmbedding);

  // pgvector's `<=>` operator is cosine DISTANCE (0 = identical, 2 = opposite),
  // so similarity = 1 - distance. Ordering by distance ascending gives the
  // most similar chunks first.
  // Pull a wider candidate pool, then re-rank for balance. Without this, the
  // coach with the most transcript chunks can fill every slot.
  const CANDIDATES = Math.max(topK * 4, 20);
  const results = await db
    .select({
      coachName: ragChunks.coachName,
      chunkText: ragChunks.chunkText,
      distance: sql<number>`${ragChunks.embedding} <=> ${vectorLiteral}::vector`,
    })
    .from(ragChunks)
    .orderBy(sql`${ragChunks.embedding} <=> ${vectorLiteral}::vector`)
    .limit(CANDIDATES);

  const SUMMARY_LABEL = "Holla Playbook"; // our curated summaries
  const SUMMARY_BOOST = 0.04; // curated, cleaner text wins close calls
  const MAX_PER_COACH = 2;

  const ranked = results
    .map((r) => ({
      coachName: r.coachName,
      chunkText: r.chunkText,
      similarity: 1 - r.distance,
    }))
    .filter((r) => r.similarity >= minSimilarity)
    .sort(
      (a, b) =>
        b.similarity + (b.coachName === SUMMARY_LABEL ? SUMMARY_BOOST : 0) -
        (a.similarity + (a.coachName === SUMMARY_LABEL ? SUMMARY_BOOST : 0)),
    );

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
 * Formats retrieved chunks into a block suitable for interpolating directly
 * into the coaching system prompt.
 */
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";

  return chunks
    .map((c) => `[${c.coachName}]: ${c.chunkText}`)
    .join("\n\n");
}