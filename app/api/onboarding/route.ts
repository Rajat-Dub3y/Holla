import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPersonas, users, datingAppEnum } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Same priority order as the frontend's personaId computation in
// onboarding/page.tsx — kept in sync deliberately so the Screen 5
// personalization chips (computed client-side before this call even
// resolves) match what actually gets stored server-side.
const PERSONA_PRIORITY = ["intellectual", "athlete", "social", "introvert", "entrepreneur"] as const;

function computePersonaId(vibeTags: string[]): string {
  for (const candidate of PERSONA_PRIORITY) {
    if (vibeTags.includes(candidate)) return candidate;
  }
  return "entrepreneur"; // same fallback the frontend uses
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { apps, vibes, commStyle, focus, routing } = body as {
    apps: string[];
    vibes: string[];
    commStyle: string;
    focus: string;
    routing: "practice" | "match";
  };

  if (!vibes?.length || !commStyle || !focus || !routing) {
    return NextResponse.json({ error: "Missing required onboarding fields" }, { status: 400 });
  }

  const personaId = computePersonaId(vibes);

  // Persist which dating apps they use — filters to only values the enum
  // actually accepts, silently dropping anything unexpected rather than
  // erroring the whole onboarding submission over a bad value.
  const validApps = apps.filter((a) => datingAppEnum.enumValues.includes(a as any));

  await db.update(users).set({ datingApps: validApps as any }).where(eq(users.id, userId));

  const existing = await db.query.userPersonas.findFirst({ where: eq(userPersonas.userId, userId) });

  if (existing) {
    await db
      .update(userPersonas)
      .set({
        vibeTags: vibes,
        communicationStyle: commStyle,
        focusArea: focus,
        personaId,
        matchOrPractice: routing,
      })
      .where(eq(userPersonas.userId, userId));
  } else {
    await db.insert(userPersonas).values({
      userId,
      vibeTags: vibes,
      communicationStyle: commStyle,
      focusArea: focus,
      personaId,
      matchOrPractice: routing,
    });
  }

  return NextResponse.json({ personaId, routeTo: routing === "practice" ? "/learning" : "/chat" });
}