-- Run once in the Neon SQL editor (or via drizzle-kit push after editing schema.ts).
ALTER TABLE rag_chunks ADD COLUMN IF NOT EXISTS situations text[];
CREATE INDEX IF NOT EXISTS rag_chunks_situations_idx ON rag_chunks USING gin (situations);