import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { db } from "@/lib/db";
import { users, creditBalances, streaks } from "@/lib/Schema";
import { eq } from "drizzle-orm";

// Free-tier defaults — matches the schema's column defaults, kept explicit
// here so the reset-time calculation below has a single source of truth.
const FREE_TIER_ANALYZE_CREDITS = 5;
const FREE_TIER_LEARNING_CREDITS = 3;

function nextDailyReset(): Date {
  const reset = new Date();
  reset.setDate(reset.getDate() + 1);
  reset.setHours(0, 0, 0, 0);
  return reset;
}

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { uid, email } = decoded;

  // Check if this Firebase user already has a row.
  const existing = await db.query.users.findFirst({
    where: eq(users.firebaseUid, uid),
  });

  if (existing) {
    return NextResponse.json({ user: existing, isNewUser: false });
  }

  // First sign-in: create the user row plus the two 1:1 rows (credit
  // balance, streak) that need to exist before any other route touches them.
  const [newUser] = await db
    .insert(users)
    .values({
      firebaseUid: uid,
      email: email ?? null,
    })
    .returning();

  await db.insert(creditBalances).values({
    userId: newUser.id,
    analyzeCreditsRemaining: FREE_TIER_ANALYZE_CREDITS,
    learningCreditsRemaining: FREE_TIER_LEARNING_CREDITS,
    dailyResetAt: nextDailyReset(),
  });

  await db.insert(streaks).values({
    userId: newUser.id,
  });

  return NextResponse.json({ user: newUser, isNewUser: true });
}