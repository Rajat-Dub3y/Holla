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
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Reuse the existing Stripe customer if one was already created — never
  // create a duplicate customer for the same user on a second checkout attempt.
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId: user.id }, // critical: lets the webhook map back to our user
    });
    stripeCustomerId = customer.id;
    await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/paywall/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/paywall`,
    metadata: { userId: user.id },
    // The subscription object itself needs its own copy of this metadata —
    // it does NOT inherit the checkout session's metadata automatically, and
    // customer.subscription.* webhook events only give us the subscription
    // object, not the original session.
    subscription_data: {
      metadata: { userId: user.id },
    },
  });

  return NextResponse.json({ checkoutUrl: session.url });
}