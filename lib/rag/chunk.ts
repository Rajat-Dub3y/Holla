const TARGET_CHUNK_SIZE = 1000; // characters, rough proxy for ~200-250 tokens
const OVERLAP_SIZE = 150; // characters carried over into the next chunk

/**
 * Splits raw text (a video transcript or blog post body) into overlapping
 * chunks along paragraph boundaries where possible, falling back to
 * sentence boundaries for paragraphs longer than the target size alone.
 * Overlap exists so a coaching principle split across a chunk boundary
 * isn't lost entirely from either chunk's context.
 */
export function chunkText(rawText: string): string[] {
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).length <= TARGET_CHUNK_SIZE) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }

    // Current chunk is full — push it and start the next one, carrying
    // over the tail of the previous chunk as overlap.
    if (current) {
      chunks.push(current);
      current = current.slice(-OVERLAP_SIZE);
    }

    // A single paragraph longer than the target size on its own gets
    // split by sentence rather than dropped or left oversized.
    if (paragraph.length > TARGET_CHUNK_SIZE) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if ((current + " " + sentence).length <= TARGET_CHUNK_SIZE) {
          current = current ? `${current} ${sentence}` : sentence;
        } else {
          chunks.push(current);
          current = sentence;
        }
      }
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }

  if (current.trim()) {
    chunks.push(current);
  }

  return chunks;
}