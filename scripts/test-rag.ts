import { retrieveRelevantChunks } from "@/lib/rag/retrieve";
import { db } from "@/lib/db";
import { ragSources, ragChunks } from "@/lib/Schema";
import { sql } from "drizzle-orm";

/**
 * Sanity check after ingestion.
 * Run: npx tsx --env-file=.env.local scripts/test-rag.ts
 */
const QUERIES = [
  "she replied 'nice' to my message",
  "how do I ask her out without sounding desperate",
  "she cancelled our plans twice",
  "she hasn't replied in three days",
  "what should my first message to her be",
  "what is the capital of France", // off-topic: similarity should be clearly lower
];

async function main() {
  const [{ s }] = await db.select({ s: sql<number>`count(*)::int` }).from(ragSources);
  const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(ragChunks);
  console.log(`sources: ${s}, chunks: ${c}\n`);
  if (!c) {
    console.warn("No chunks yet. Run seed-and-ingest-rag.ts first.");
    return;
  }

  for (const q of QUERIES) {
    const hits = await retrieveRelevantChunks(q, 3);
    console.log(`Q: ${q}`);
    for (const h of hits) {
      console.log(`  ${h.similarity.toFixed(3)}  ${h.chunkText.slice(0, 90).replace(/\n/g, " ")}...`);
    }
    console.log();
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });