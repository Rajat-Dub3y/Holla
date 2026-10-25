import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { and, gte, sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { betaRequests } from "@/lib/Schema";
import { runBetaPipeline, type BetaImage, type HistoryTurn } from "@/lib/beta/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 3;
const MAX_TOTAL_BASE64 = 4_000_000; // ~3 MB of image data (Vercel body limit is 4.5 MB)
const MAX_TEXT = 6000;
const PER_IP_PER_HOUR = Number(process.env.BETA_PER_IP_PER_HOUR ?? 60);
const DAILY_CAP = Number(process.env.BETA_DAILY_CAP ?? 1500);
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

function hashIp(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256")
    .update(ip + (process.env.BETA_IP_SALT ?? "holla-beta"))
    .digest("hex")
    .slice(0, 32);
}

export async function POST(req: NextRequest) {
  const started = Date.now();

  let body: {
    sessionId?: string;
    mode?: "reply" | "opener";
    text?: string;
    images?: BetaImage[];
    history?: HistoryTurn[];
    hint?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const text = (body.text ?? "").slice(0, MAX_TEXT);
  const images = (body.images ?? []).slice(0, MAX_IMAGES);
  const mode = body.mode === "opener" ? "opener" : "reply";
  const sessionId = (body.sessionId ?? "anon").slice(0, 64);
  const hint = body.hint?.slice(0, 200);
  const history = (body.history ?? [])
    .filter((t) => (t.sender === "her" || t.sender === "him") && typeof t.text === "string")
    .slice(-30)
    .map((t) => ({ sender: t.sender, text: t.text.slice(0, 1000) }));

  if (!text.trim() && images.length === 0) {
    return NextResponse.json({ error: "Paste her message, type it, or upload a screenshot." }, { status: 400 });
  }
  if (images.some((i) => !ALLOWED_MIME.includes(i.mimeType) || typeof i.data !== "string")) {
    return NextResponse.json({ error: "Please upload a JPG, PNG or WebP image." }, { status: 400 });
  }
  if (images.reduce((n, i) => n + i.data.length, 0) > MAX_TOTAL_BASE64) {
    return NextResponse.json({ error: "Those images are too large. Try cropping the screenshot." }, { status: 413 });
  }

  // ── Abuse limits (no login in beta, so protect the Gemini quota) ──
  const ipHash = hashIp(req);
  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ hour }] = await db
      .select({ hour: sql<number>`count(*)::int` })
      .from(betaRequests)
      .where(and(eq(betaRequests.ipHash, ipHash), gte(betaRequests.createdAt, hourAgo)));
    if (hour >= PER_IP_PER_HOUR) {
      return NextResponse.json({ error: "You've hit the beta limit for now. Try again in a little while." }, { status: 429 });
    }
    const [{ day }] = await db
      .select({ day: sql<number>`count(*)::int` })
      .from(betaRequests)
      .where(gte(betaRequests.createdAt, dayAgo));
    if (day >= DAILY_CAP) {
      return NextResponse.json({ error: "Holla beta is at capacity today. Please try again tomorrow." }, { status: 429 });
    }
  } catch (err) {
    console.error("[beta] limit check failed (continuing):", err);
  }

  try {
    const result = await runBetaPipeline({ requestedMode: mode, text, images, history, hint });
    const latencyMs = Date.now() - started;

    let requestId: string | null = null;
    try {
      const [row] = await db
        .insert(betaRequests)
        .values({
          sessionId,
          ipHash,
          inputType: result.input_type,
          sourceApp: result.source_app,
          mode: result.mode,
          stage: result.stage,
          hadImage: images.length > 0,
          herMessage: result.her_message,
          readText: result.read,
          replies: result.replies,
          nextMove: result.next_move,
          retrievedSources: result.retrieved_sources,
          understanding: result.understanding,
          latencyMs,
        })
        .returning({ id: betaRequests.id });
      requestId = row.id;
    } catch (err) {
      console.error("[beta] logging failed (continuing):", err);
    }

    // Retrieved sources + coach names are hidden from users; only shown to the team.
    const debugKey = process.env.BETA_DEBUG_KEY;
    const isDebug = !!debugKey && req.headers.get("x-beta-debug") === debugKey;

    const { retrieved_sources, understanding, ...publicResult } = result;
    return NextResponse.json({
      requestId,
      ...publicResult,
      ...(isDebug ? { retrieved_sources, understanding, latencyMs } : {}),
    });
  } catch (err) {
    console.error("[beta] pipeline failed:", err);
    try {
      await db.insert(betaRequests).values({
        sessionId,
        ipHash,
        hadImage: images.length > 0,
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message.slice(0, 500) : "unknown",
      });
    } catch {
      /* ignore */
    }
    return NextResponse.json({ error: "Something went wrong reading that. Please try again." }, { status: 502 });
  }
}
