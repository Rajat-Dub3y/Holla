import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/lib/Schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  // Cancel at period end, not immediately — the user keeps Premium access
  // through what they already paid for. The actual downgrade to "free"
  // happens via the webhook's customer.subscription.deleted event once the
  // period genuinely ends, not here — this route only schedules the cancellation.
  const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  return NextResponse.json({
    canceled: true,
    accessUntil: new Date(subscription.items.data[0].current_period_end * 1000),
  });
}