import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

// gemini-embedding-001 defaults to 3072 dims, but supports truncation to 768
// via outputDimensionality. We request 768 so it matches the vector(768)
// column already in schema.ts — no migration needed.
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 768;

export async function embedText(text: string): Promise<number[]> {
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

/**
 * Batch version — embeds multiple chunks in one call where the API allows
 * it, falling back to sequential calls. Used by the ingestion script, which
 * may need to embed hundreds of chunks from a single long transcript.
 */
export async function embedTextBatch(texts: string[]): Promise<number[][]> {
  // Sequential for now — simplest and safest against rate limits on the
  // free tier. Revisit with actual batch-endpoint support if ingestion
  // volume grows large enough that this becomes slow.
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embedText(text));
  }
  return results;
}