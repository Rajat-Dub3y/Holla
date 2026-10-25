import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { betaFeedback, betaRequests } from "@/lib/Schema";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  let body: { requestId?: string; replyIndex?: number; vote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { requestId, replyIndex, vote } = body;
  if (
    !requestId || !UUID.test(requestId) ||
    !Number.isInteger(replyIndex) || replyIndex! < 0 || replyIndex! > 2 ||
    (vote !== "up" && vote !== "down")
  ) {
    return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
  }

  const exists = await db.query.betaRequests.findFirst({ where: eq(betaRequests.id, requestId) });
  if (!exists) return NextResponse.json({ error: "Unknown request." }, { status: 404 });

  // One vote per reply: a new vote replaces the old one.
  await db
    .delete(betaFeedback)
    .where(and(eq(betaFeedback.requestId, requestId), eq(betaFeedback.replyIndex, replyIndex!)));
  await db.insert(betaFeedback).values({ requestId, replyIndex: replyIndex!, vote });

  return NextResponse.json({ ok: true });
}
