'use client';

import Link from 'next/link';
import { ArrowRight, MessageCircle, BookOpen, Calendar, Sparkles, Lock } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { CreditPill } from '@/components/credit-pill';
import { PERSONAS, BRAND } from '@/lib/brand';
import { mockUser } from '@/lib/mock-data';

const FEATURES = [
  {
    href: '/chat',
    icon: MessageCircle,
    title: 'Conversation Coach',
    desc: 'Get coached through a real conversation',
    accent: 'coral',
    locked: false,
  },
  {
    href: '/progress',
    icon: BookOpen,
    title: 'Attraction Insights',
    desc: 'See what your patterns are',
    accent: 'sage',
    locked: false,
  },
  {
    href: '/home',
    icon: Calendar,
    title: 'Date Planner',
    desc: 'Plan the move from chat to date',
    accent: 'beige-700',
    locked: false,
  },
  {
    href: '/pricing',
    icon: Sparkles,
    title: 'Romeo AI',
    desc: 'Your always-on conversation copilot',
    accent: 'beige-800',
    locked: true,
    elite: true,
  },
];

export default function HomePage() {
  const persona = PERSONAS[mockUser.persona];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-6 md:px-8 md:py-10">
        {/* Mobile top bar */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <span className="font-serif text-xl font-bold text-charcoal">{BRAND.name}</span>
          <CreditPill credits={mockUser.credits} />
        </div>

        {/* Greeting */}
        <div className="mb-6 md:mb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-mutedtext">
            {persona.dashboardTone}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-charcoal md:text-4xl">
            Hey, {mockUser.firstName}.
          </h1>
        </div>

        {/* Hero card */}
        <Link
          href="/chat"
          className="group block rounded-2xl bg-beige-400 p-6 transition-shadow hover:shadow-md md:p-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/15 px-2.5 py-1 font-mono text-xs text-sage-dark">
                <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                AI Coach · Active
              </span>
              <h2 className="mt-3 max-w-md font-serif text-2xl font-bold leading-tight text-charcoal md:text-3xl">
                {persona.featuredPrompt}
              </h2>
              <p className="mt-2 text-sm text-beige-900/70">
                Open a conversation and the coach will read along with you.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-charcoal transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Persona-aware insight callout */}
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-beige-200 bg-beige-50 p-4">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral/15">
            <span className="text-xs text-coral">!</span>
          </div>
          <p className="text-sm text-charcoal">
            <span className="font-semibold">Your coach noticed:</span> You tend to do
            well with women who match your {mockUser.vibeTags.slice(0, 2).join(' and ')}{' '}
            energy. Your threads with pure extroverts drop off by message 3 — try opening
            with something more direct there.
          </p>
        </div>

        {/* Section label */}
        <div className="mb-4 mt-10">
          <h3 className="font-serif text-lg font-bold text-charcoal">What&apos;s your move today?</h3>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {FEATURES.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className={`group relative overflow-hidden rounded-2xl border p-5 transition-all hover:shadow-sm ${
                feature.locked
                  ? 'border-beige-200 bg-beige-50'
                  : 'border-beige-200 bg-white'
              }`}
            >
              {feature.elite && (
                <span className="absolute right-3 top-3 rounded-full bg-beige-900 px-2 py-0.5 font-mono text-[10px] text-cream">
                  Elite
                </span>
              )}
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${
                  feature.accent === 'coral'
                    ? 'bg-coral/15'
                    : feature.accent === 'sage'
                      ? 'bg-sage/15'
                      : 'bg-beige-200'
                }`}
              >
                {feature.locked ? (
                  <Lock className="h-5 w-5 text-beige-700" />
                ) : (
                  <feature.icon
                    className={`h-5 w-5 ${
                      feature.accent === 'coral'
                        ? 'text-coral'
                        : feature.accent === 'sage'
                          ? 'text-sage'
                          : 'text-beige-800'
                    }`}
                  />
                )}
              </div>
              <h4 className="font-serif text-base font-bold text-charcoal">
                {feature.title}
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-mutedtext">
                {feature.desc}
              </p>
              {feature.locked && (
                <p className="mt-3 font-mono text-[10px] text-beige-700">
                  Coming soon
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
