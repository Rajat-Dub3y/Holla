'use client';

import Link from 'next/link';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import { BRAND, PRICING_TIERS } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useMe } from '@/lib/use-me';

export default function PricingPage() {
  const router = useRouter();
  const { profile } = useMe();
  const [managing, setManaging] = useState(false);
  const [accessUntil, setAccessUntil] = useState<string | null>(null);

  const handlePremiumAction = async () => {
    if (profile?.tier && profile.tier !== 'free') {
      setManaging((current) => !current);
      return;
    }
    if (!profile) {
      router.push('/onboarding');
      return;
    }
    try {
      const result = await apiFetch<{ checkoutUrl: string }>('/api/stripe/create-checkout-session', { method: 'POST' });
      window.location.href = result.checkoutUrl;
    } catch {
      toast.error('Could not start checkout. Please try again.');
    }
  };

  const cancelSubscription = async () => {
    try {
      const result = await apiFetch<{ canceled: boolean; accessUntil: string }>('/api/stripe/cancel', { method: 'POST' });
      setAccessUntil(result.accessUntil);
      toast.success(`You keep Premium until ${new Date(result.accessUntil).toLocaleDateString()}`);
    } catch {
      toast.error('Could not schedule cancellation. Please try again.');
    }
  };
  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-beige-200 bg-cream/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="font-serif text-xl font-bold text-charcoal">
            {BRAND.name}
          </Link>
          <Link
            href="/onboarding"
            className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark md:px-6"
          >
            Get started
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-mutedtext transition-colors hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        <div className="mb-12 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-coral">
            Pricing
          </p>
          <h1 className="text-balance font-serif text-3xl font-bold text-charcoal md:text-5xl">
            Start free. Upgrade when it works.
          </h1>
          <p className="mt-4 text-lg text-mutedtext">
            No tricks, no hidden caps. Free gets you real coaching every day. Premium
            removes the limits. Elite is coming soon.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={cn(
                'relative flex flex-col rounded-2xl border p-6 md:p-8',
                tier.highlight
                  ? 'border-coral bg-beige-100 shadow-sm'
                  : tier.locked
                    ? 'border-beige-200 bg-white opacity-80'
                    : 'border-beige-200 bg-white'
              )}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-coral px-3 py-1 font-mono text-xs text-cream">
                  Most popular
                </span>
              )}
              {tier.locked && (
                <span className="absolute -top-3 left-6 rounded-full bg-beige-900 px-3 py-1 font-mono text-xs text-cream">
                  Coming soon
                </span>
              )}

              <h3 className="font-serif text-xl font-bold text-charcoal">{tier.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-serif text-4xl font-bold text-charcoal">{tier.price}</span>
                <span className="text-sm text-mutedtext">/ {tier.period}</span>
              </div>
              <p className="mt-2 text-sm text-mutedtext">{tier.description}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-charcoal">
                    {tier.locked ? (
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-beige-600" />
                    ) : (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                    )}
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.id === 'premium' ? <button
                type="button"
                onClick={handlePremiumAction}
                className={cn(
                  'mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors',
                  tier.locked
                    ? 'cursor-default bg-beige-200 text-mutedtext'
                    : tier.highlight
                      ? 'bg-coral text-cream hover:bg-coral-dark'
                      : 'border border-beige-300 text-charcoal hover:bg-beige-100'
                )}
              >
                {profile?.tier && profile.tier !== 'free' ? 'Manage' : 'Upgrade'}
              </button> : <Link
                href={tier.locked ? '#' : '/onboarding'}
                aria-disabled={Boolean(tier.locked)}
                onClick={(event) => { if (tier.locked) event.preventDefault(); }}
                className={cn(
                  'mt-8 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors',
                  tier.locked
                    ? 'cursor-default bg-beige-200 text-mutedtext'
                    : 'border border-beige-300 text-charcoal hover:bg-beige-100'
                )}
              >
                  {tier.cta}
              </Link>}
              {tier.id === 'premium' && managing && <div className="mt-3 text-center">{accessUntil ? <p className="text-xs text-mutedtext">You keep Premium until {new Date(accessUntil).toLocaleDateString()}</p> : <button onClick={cancelSubscription} className="text-sm font-medium text-coral hover:underline">Cancel subscription</button>}</div>}
            </div>
          ))}
        </div>

        {/* Comparison detail */}
        <div className="mt-16">
          <h2 className="mb-6 font-serif text-2xl font-bold text-charcoal">
            What&apos;s in each tier
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-beige-300">
                  <th className="py-3 text-left text-sm font-medium text-mutedtext">Feature</th>
                  <th className="py-3 text-center text-sm font-medium text-mutedtext">Free</th>
                  <th className="py-3 text-center text-sm font-semibold text-coral">Premium</th>
                  <th className="py-3 text-center text-sm font-medium text-mutedtext">Elite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-200">
                {[
                  { feature: 'Daily coaching credits', free: '20/day', premium: 'Unlimited', elite: 'Unlimited' },
                  { feature: 'Active conversations', free: '1 at a time', premium: 'Unlimited', elite: 'Unlimited' },
                  { feature: 'Conversation insights', free: 'Basic', premium: 'Full', elite: 'Full' },
                  { feature: 'Growth scorecard', free: '—', premium: 'Openers / Escalation / Consistency', elite: 'Custom categories' },
                  { feature: 'Weekly digest', free: '—', premium: 'Yes', elite: 'Yes' },
                  { feature: 'Learning scenarios', free: 'Community', premium: 'All unlocked', elite: 'All + custom' },
                  { feature: 'Romeo AI copilot', free: '—', premium: '—', elite: 'Yes' },
                  { feature: 'Screenshot analysis', free: '—', premium: '—', elite: 'Yes' },
                  { feature: 'Direct coach access', free: '—', premium: '—', elite: 'Yes' },
                ].map((row) => (
                  <tr key={row.feature}>
                    <td className="py-3 text-sm text-charcoal">{row.feature}</td>
                    <td className="py-3 text-center text-sm text-mutedtext">{row.free}</td>
                    <td className="py-3 text-center text-sm font-medium text-charcoal">{row.premium}</td>
                    <td className="py-3 text-center text-sm text-mutedtext">{row.elite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="mb-6 font-serif text-2xl font-bold text-charcoal">
            Questions
          </h2>
          <div className="space-y-4">
            {[
              { q: 'Is this a reply generator?', a: 'No. Holla coaches you — it explains what she meant, suggests one grounded next move, and gives feedback on your draft. You stay in control.' },
              { q: 'What happens when I run out of credits?', a: 'You see a blurred preview of what the next insight would say, and you can wait for your daily reset or upgrade. The free option is never hidden or de-emphasized.' },
              { q: 'Can I cancel Premium anytime?', a: 'Yes. No contracts, no retention dark patterns. Cancel from your profile and you keep access until the end of your billing period.' },
              { q: 'When is Elite available?', a: 'Soon. Romeo AI is still in development — we want it right before we charge for it. Premium users get early access when it launches.' },
            ].map((item) => (
              <div key={item.q} className="rounded-xl border border-beige-200 bg-white p-5">
                <h3 className="font-semibold text-charcoal">{item.q}</h3>
                <p className="mt-2 text-sm text-mutedtext">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-beige-200 bg-cream">
        <div className="mx-auto max-w-6xl px-6 py-8 md:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <span className="font-serif text-lg font-bold text-charcoal">{BRAND.name}</span>
            <p className="font-mono text-xs text-mutedtext">{BRAND.tagline}</p>
          </div>
          <p className="mt-4 font-mono text-xs text-mutedtext">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
