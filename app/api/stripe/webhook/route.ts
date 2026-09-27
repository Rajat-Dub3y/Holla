import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/lib/Schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

async function setUserTierBySubscription(
  subscription: Stripe.Subscription,
  tier: "premium" | "free",
) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("Webhook: subscription has no userId in metadata", subscription.id);
    return;
  }

  await db
    .update(users)
    .set({
      subscriptionTier: tier,
      stripeSubscriptionId: tier === "free" ? null : subscription.id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function POST(req: NextRequest) {
  // Stripe requires the RAW request body for signature verification — do
  // not call req.json() before this, it will invalidate the signature check.
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      // Fires once, right after successful payment. The subscription may
      // not be fully "active" yet in edge cases — customer.subscription.updated
      // below is the more reliable source of truth for actual status changes,
      // but this gives the fastest possible upgrade for the common case.
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        await setUserTierBySubscription(subscription, "premium");
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      // "active" or "trialing" = paying; anything else (past_due, canceled,
      // unpaid, incomplete_expired) = treat as free rather than guessing —
      // better to under-grant than leave a lapsed payer on Premium.
      const isPaying = subscription.status === "active" || subscription.status === "trialing";
      await setUserTierBySubscription(subscription, isPaying ? "premium" : "free");
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await setUserTierBySubscription(subscription, "free");
      break;
    }

    default:
      // Unhandled event types are expected and fine to ignore — Stripe
      // sends far more event types than this product needs to act on.
      break;
  }

  return NextResponse.json({ received: true });
}