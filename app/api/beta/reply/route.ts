import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { waitUntil } from "@vercel/functions";
import { and, gte, sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { betaRequests, userPersonas } from "@/lib/schema";
import { getAuthenticatedUserId } from "@/lib/auth";
import { runBetaPipeline, LimitError, type BetaImage, type BetaPersona, type HistoryTurn } from "@/lib/beta/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 3;
const MAX_TOTAL_BASE64 = 4_000_000; // ~3 MB of image data (Vercel body limit is 4.5 MB)
const MAX_TEXT = 6000;
const PER_IP_PER_HOUR = Number(process.env.BETA_PER_IP_PER_HOUR ?? 60);
const DAILY_CAP = Number(process.env.BETA_DAILY_CAP ?? 1500);
const MEM_HITS = new Map<string, { start: number; n: number }>();
const PERSONA_CACHE = new Map<string, { at: number; persona: BetaPersona | undefined }>();
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
    firstMover?: "auto" | "she" | "me";
    aboutMe?: string;
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
  const firstMover = body.firstMover === "she" || body.firstMover === "me" ? body.firstMover : "auto";
  const aboutMe = (body.aboutMe ?? "").slice(0, 400);
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

  // ── Abuse limits + optional persona ──
  // Neither blocks the Gemini call: both run in parallel with it. The limit
  // check can stop the request before anything is shown; the persona is only
  // needed when the reply is written.
  const ipHash = hashIp(req);
  const tPre = Date.now();
  let limitMs = 0;
  let personaMs = 0;

  // Instant in-memory guard (per server instance) so an obvious flood is
  // refused with no database or Gemini cost at all.
  {
    const now = Date.now();
    const rec = MEM_HITS.get(ipHash);
    if (!rec || now - rec.start > 3_600_000) MEM_HITS.set(ipHash, { start: now, n: 1 });
    else if (++rec.n > PER_IP_PER_HOUR) {
      return NextResponse.json({ error: "You've hit the beta limit for now. Try again in a little while." }, { status: 429 });
    }
    if (MEM_HITS.size > 5000) MEM_HITS.clear();
  }

  // Database check (counts survive restarts and cover all instances). Rejects with LimitError.
  const gate: Promise<void> = (async () => {
    const t = Date.now();
    try {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [row] = await db
        .select({
          hour: sql<number>`count(*) filter (where ${betaRequests.ipHash} = ${ipHash} and ${betaRequests.createdAt} >= ${hourAgo})::int`,
          day: sql<number>`count(*)::int`,
        })
        .from(betaRequests)
        .where(gte(betaRequests.createdAt, dayAgo));
      limitMs = Date.now() - t;
      if (row.hour >= PER_IP_PER_HOUR) throw new LimitError("You've hit the beta limit for now. Try again in a little while.");
      if (row.day >= DAILY_CAP) throw new LimitError("Holla beta is at capacity today. Please try again tomorrow.");
    } catch (err) {
      limitMs = Date.now() - t;
      if (err instanceof LimitError) throw err;
      console.error("[beta] limit check failed (continuing):", err);
    }
  })();
  gate.catch(() => undefined); // avoid an unhandled-rejection warning if the pipeline fails first

  // Signed-in users get their onboarding style applied. Anonymous testers skip
  // this. Read with the verified token (never from the request body), and
  // cached in memory for a few minutes so repeat requests skip the database.
  const personaPromise: Promise<BetaPersona | undefined> = (async () => {
    const t = Date.now();
    try {
      if (!req.headers.get("authorization")) return undefined;
      const userId = await getAuthenticatedUserId(req);
      if (!userId) return undefined;
      const hit = PERSONA_CACHE.get(userId);
      if (hit && Date.now() - hit.at < 5 * 60_000) return hit.persona;
      const row = await db.query.userPersonas.findFirst({ where: eq(userPersonas.userId, userId) });
      const persona = row ? { vibes: row.vibeTags ?? [], commStyle: row.communicationStyle, focus: row.focusArea } : undefined;
      if (PERSONA_CACHE.size > 2000) PERSONA_CACHE.clear();
      PERSONA_CACHE.set(userId, { at: Date.now(), persona });
      return persona;
    } catch (err) {
      console.error("[beta] persona lookup failed (continuing without it):", err);
      return undefined;
    } finally {
      personaMs = Date.now() - t;
    }
  })();
  const preMs = Date.now() - tPre; // now ~0: nothing is awaited here any more

  // Stream newline-delimited JSON so the page can show text as soon as it exists:
  //   {"type":"understood",...}  her message as read, after Step 1
  //   {"type":"read","text":...} the "read", growing as it is written
  //   {"type":"final",...}       the complete result (same shape as before)
  //   {"type":"error","error":...}
  const isDebug = !!process.env.BETA_DEBUG_KEY && req.headers.get("x-beta-debug") === process.env.BETA_DEBUG_KEY;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const result = await runBetaPipeline(
          { requestedMode: mode, text, images, history, hint, firstMover, aboutMe, persona: personaPromise, gate },
          { onEvent: (e) => send(e) },
        );
        const latencyMs = Date.now() - started;
        const persona = await personaPromise;
        console.log(
          "[beta] timing",
          JSON.stringify({ total_ms: latencyMs, before_pipeline_ms: preMs, auth_and_persona_ms: personaMs, limit_query_ms: limitMs, signed_in: !!req.headers.get("authorization"), ...result.timings }),
        );

        // Log AFTER the response (waitUntil keeps the function alive for it).
        // The id is made here so thumbs up/down can use it right away.
        const requestId = randomUUID();
        waitUntil(
          db
            .insert(betaRequests)
            .values({
              id: requestId,
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
              understanding: {
                ...result.understanding,
                _context: { firstMover, hadAboutMe: aboutMe.length > 0, persona: persona ?? null, timings: result.timings },
              },
              latencyMs,
            })
            .then(() => undefined)
            .catch((err) => console.error("[beta] logging failed (continuing):", err)),
        );

        // Retrieved sources + coach names are hidden from users; only shown to the team.
        const { retrieved_sources, understanding, timings, ...publicResult } = result;
        send({
          type: "final",
          requestId,
          ...publicResult,
          ...(isDebug ? { retrieved_sources, understanding, timings, latencyMs } : {}),
        });
      } catch (err) {
        if (!(err instanceof LimitError)) console.error("[beta] pipeline failed:", err);
        waitUntil(
          db
            .insert(betaRequests)
            .values({
              sessionId,
              ipHash,
              hadImage: images.length > 0,
              latencyMs: Date.now() - started,
              error: err instanceof Error ? err.message.slice(0, 500) : "unknown",
            })
            .then(() => undefined)
            .catch(() => undefined),
        );
        send({
          type: "error",
          error: err instanceof LimitError ? err.message : "Something went wrong reading that. Please try again.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}