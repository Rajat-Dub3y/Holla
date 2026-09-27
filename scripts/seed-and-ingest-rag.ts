import { registerSource, processPendingSources } from "@/lib/rag/ingest";

// Fill this in with real, verified URLs for each coach — the master direction
// doc names Matthew Hussey, Corey Wayne, Amy North, and Courtney Ryan
// explicitly ("+ more" for the remaining slots in the "8 named coaches"
// framing). I haven't filled in actual video/article URLs here since I can't
// verify a specific link is real, current, and actually the right content —
// that needs a human picking the specific sources to use.
const SOURCES: Array<{
  coachName: string;
  sourceType: "youtube" | "blog";
  sourceUrl: string;
}> = [
  // { coachName: "Matthew Hussey", sourceType: "youtube", sourceUrl: "https://youtube.com/watch?v=..." },
  // { coachName: "Corey Wayne", sourceType: "youtube", sourceUrl: "https://youtube.com/watch?v=..." },
  // { coachName: "Amy North", sourceType: "blog", sourceUrl: "https://..." },
  // { coachName: "Courtney Ryan", sourceType: "youtube", sourceUrl: "https://youtube.com/watch?v=..." },
];

async function main() {
  if (SOURCES.length === 0) {
    console.warn(
      "SOURCES is empty — fill in real coach video/article URLs in this file before running.",
    );
    return;
  }

  for (const source of SOURCES) {
    await registerSource(source);
  }

  await processPendingSources();
}

main()
  .then(() => {
    console.log("RAG ingestion run complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("RAG ingestion run failed:", err);
    process.exit(1);
  });