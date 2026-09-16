'use client';

import Link from 'next/link';
import { Lock, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { CreditPill } from '@/components/credit-pill';
import { BRAND } from '@/lib/brand';
import { mockProfileInsights } from '@/lib/mock-data';
import { LockedOverlay } from '@/components/locked-overlay';

export default function ProgressPage() {
  const freeInsights = mockProfileInsights.filter((i) => !i.locked);
  const lockedInsights = mockProfileInsights.filter((i) => i.locked);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-6 md:px-8 md:py-10">
        {/* Mobile top bar */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <span className="font-serif text-xl font-bold text-charcoal">{BRAND.name}</span>
          <CreditPill credits={1180} />
        </div>

        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-coral">
            Growth view
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-charcoal md:text-4xl">
            What your coach noticed
          </h1>
          <p className="mt-2 text-sm text-mutedtext">
            Not a score. Just a perceptive friend telling you what your patterns are.
          </p>
        </div>

        {/* Free insights — always visible */}
        <div className="space-y-4">
          {freeInsights.map((insight) => (
            <div
              key={insight.id}
              className="rounded-2xl border border-beige-200 bg-white p-5 md:p-6"
            >
              <h3 className="font-serif text-lg font-bold text-charcoal">
                {insight.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-mutedtext">
                {insight.description}
              </p>
            </div>
          ))}
        </div>

        {/* Locked insights */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-charcoal">
              Deeper insights
            </h2>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-sm font-medium text-coral hover:underline"
            >
              Unlock all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {lockedInsights.map((insight) => (
              <LockedOverlay
                key={insight.id}
                label={`${insight.category} · Premium`}
                onClick={() => {}}
              >
                <div className="rounded-2xl border border-beige-200 bg-white p-5 md:p-6">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-beige-700" />
                    <span className="font-mono text-xs text-beige-700">{insight.category}</span>
                  </div>
                  <h3 className="mt-2 font-serif text-lg font-bold text-charcoal">
                    {insight.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-mutedtext">
                    {insight.description}
                  </p>
                </div>
              </LockedOverlay>
            ))}
          </div>
        </div>

        {/* Premium scorecard preview */}
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-charcoal">
              Your scorecard
            </h2>
            <span className="font-mono text-xs text-mutedtext">Premium</span>
          </div>
          <LockedOverlay label="Premium scorecard" onClick={() => {}}>
            <div className="grid grid-cols-3 gap-4">
              {['Openers', 'Escalation', 'Consistency'].map((cat) => (
                <div key={cat} className="rounded-2xl border border-beige-200 bg-white p-5">
                  <p className="font-mono text-xs text-mutedtext">{cat}</p>
                  <div className="mt-3 h-2 w-full rounded-full bg-beige-200">
                    <div className="h-2 rounded-full bg-coral" style={{ width: '65%' }} />
                  </div>
                  <p className="mt-2 text-xs text-mutedtext">
                    Above average for your apps
                  </p>
                </div>
              ))}
            </div>
          </LockedOverlay>
        </div>

        {/* Weekly digest preview */}
        <div className="mt-8">
          <LockedOverlay label="Weekly digest · Premium" onClick={() => {}}>
            <div className="rounded-2xl border border-beige-200 bg-beige-50 p-5 md:p-6">
              <p className="font-mono text-xs text-mutedtext">Week of Sep 8–14</p>
              <h3 className="mt-2 font-serif text-lg font-bold text-charcoal">
                Your week in review
              </h3>
              <p className="mt-2 text-sm text-mutedtext">
                12 conversations coached · 3 moved to dates · 2 went quiet after message 5.
                Your strongest day was Tuesday. Your weakest was Thursday.
              </p>
            </div>
          </LockedOverlay>
        </div>
      </div>
    </AppShell>
  );
}
