import { db } from "@/lib/db";
import { users, creditBalances, threads } from "@/lib/Schema";
import { eq, and, sql, count } from "drizzle-orm";

const FREE_TIER_ANALYZE_CREDITS = 5;
const FREE_TIER_LEARNING_CREDITS = 3;
const FREE_TIER_MAX_ACTIVE_THREADS = 2;

function nextDailyReset(): Date {
  const reset = new Date();
  reset.setDate(reset.getDate() + 1);
  reset.setHours(0, 0, 0, 0);
  return reset;
}

/**
 * Lazy reset: called before any credit check. If the stored reset time has
 * passed, resets the daily pools and pushes the reset time forward one day.
 * No cron job needed — this is cheap enough to run on every credit check,
 * and only actually writes when a reset is genuinely due.
 */
async function resetIfNeeded(userId: string) {
  const balance = await db.query.creditBalances.findFirst({
    where: eq(creditBalances.userId, userId),
  });

  if (!balance) {
    throw new Error(`No credit_balances row for user ${userId} — was the session route's seed step skipped?`);
  }

  if (balance.dailyResetAt <= new Date()) {
    await db
      .update(creditBalances)
      .set({
        analyzeCreditsRemaining: FREE_TIER_ANALYZE_CREDITS,
        learningCreditsRemaining: FREE_TIER_LEARNING_CREDITS,
        dailyResetAt: nextDailyReset(),
        updatedAt: new Date(),
      })
      .where(eq(creditBalances.userId, userId));
  }
}

async function isUnlimitedTier(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return user?.subscriptionTier === "premium" || user?.subscriptionTier === "elite";
}

export type CreditCheckResult =
  | { allowed: true }
  | { allowed: false; reason: "no_credits" | "thread_cap" };

/**
 * Call before running the "Analyze & Suggest" step (reading her message,
 * generating an insight + next-step prompt). Premium/Elite always pass.
 * Free tier: atomically decrements analyzeCreditsRemaining — the WHERE
 * clause guards against a race where two requests both read "1 remaining"
 * and both try to proceed; only one UPDATE will actually match and return a row.
 */
export async function consumeAnalyzeCredit(userId: string): Promise<CreditCheckResult> {
  if (await isUnlimitedTier(userId)) {
    return { allowed: true };
  }

  await resetIfNeeded(userId);

  const [updated] = await db
    .update(creditBalances)
    .set({
      analyzeCreditsRemaining: sql`${creditBalances.analyzeCreditsRemaining} - 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(creditBalances.userId, userId),
        sql`${creditBalances.analyzeCreditsRemaining} > 0`,
      ),
    )
    .returning();

  return updated ? { allowed: true } : { allowed: false, reason: "no_credits" };
}

/** Same atomic pattern, for the Learning section's separate small credit pool. */
export async function consumeLearningCredit(userId: string): Promise<CreditCheckResult> {
  if (await isUnlimitedTier(userId)) {
    return { allowed: true };
  }

  await resetIfNeeded(userId);

  const [updated] = await db
    .update(creditBalances)
    .set({
      learningCreditsRemaining: sql`${creditBalances.learningCreditsRemaining} - 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(creditBalances.userId, userId),
        sql`${creditBalances.learningCreditsRemaining} > 0`,
      ),
    )
    .returning();

  return updated ? { allowed: true } : { allowed: false, reason: "no_credits" };
}

/**
 * Call before creating a NEW thread (not before sending messages in an
 * existing one — existing active threads keep working even at the cap).
 * Free tier: max 2 threads with status 'active' at once.
 */
export async function canCreateNewThread(userId: string): Promise<CreditCheckResult> {
  if (await isUnlimitedTier(userId)) {
    return { allowed: true };
  }

  const [{ activeCount }] = await db
    .select({ activeCount: count() })
    .from(threads)
    .where(and(eq(threads.userId, userId), eq(threads.status, "active")));

  return activeCount < FREE_TIER_MAX_ACTIVE_THREADS
    ? { allowed: true }
    : { allowed: false, reason: "thread_cap" };
}

/**
 * Read-only balance fetch for UI display (credit counter pill, cap-hit
 * screen, etc.) — does not consume anything, but does apply the lazy reset
 * first so the displayed number is never stale past midnight.
 */
export async function getCreditBalance(userId: string) {
  await resetIfNeeded(userId);
  return db.query.creditBalances.findFirst({ where: eq(creditBalances.userId, userId) });
}

export async function refundAnalyzeCredit(userId: string) {
  if (await isUnlimitedTier(userId)) return;
  await db
    .update(creditBalances)
    .set({
      analyzeCreditsRemaining: sql`${creditBalances.analyzeCreditsRemaining} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(creditBalances.userId, userId));
}