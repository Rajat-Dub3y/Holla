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
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(queryText);
  const vectorLiteral = toPgVectorLiteral(queryEmbedding);

  // pgvector's `<=>` operator is cosine DISTANCE (0 = identical, 2 = opposite),
  // so similarity = 1 - distance. Ordering by distance ascending gives the
  // most similar chunks first.
  const results = await db
    .select({
      coachName: ragChunks.coachName,
      chunkText: ragChunks.chunkText,
      distance: sql<number>`${ragChunks.embedding} <=> ${vectorLiteral}::vector`,
    })
    .from(ragChunks)
    .orderBy(sql`${ragChunks.embedding} <=> ${vectorLiteral}::vector`)
    .limit(topK);

  return results.map((r) => ({
    coachName: r.coachName,
    chunkText: r.chunkText,
    similarity: 1 - r.distance,
  }));
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