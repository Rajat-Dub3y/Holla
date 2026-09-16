'use client';

import Link from 'next/link';
import { ArrowRight, MessageCircle, BookOpen, TrendingUp, Check } from 'lucide-react';
import { BRAND, COACHES, PRICING_TIERS } from '@/lib/brand';
import { AnnotatedCircle, AnnotatedUnderline, StickyNote } from '@/components/annotated-text';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-beige-200 bg-cream/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
          <span className="font-serif text-xl font-bold text-charcoal">{BRAND.name}</span>
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/pricing" className="hidden text-sm text-mutedtext hover:text-charcoal md:block">
              Pricing
            </Link>
            <Link
              href="/onboarding"
              className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark md:px-6"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24 lg:py-32">
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <div className="animate-fade-in-up">
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-coral">
                Not a reply generator. A coach.
              </p>
              <h1 className="text-balance font-serif text-4xl font-bold leading-tight text-charcoal md:text-5xl lg:text-6xl">
                You get matches.
                <br />
                <span className="text-coral">But no dates?</span>
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-mutedtext">
                {BRAND.name} sits beside you through real conversations — reads what she said,
                explains what it means, suggests one grounded next move, and helps you
                actually get the date.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark"
                >
                  See how it works
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-lg border border-beige-300 px-6 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-beige-100"
                >
                  See pricing
                </Link>
              </div>
              <p className="mt-4 font-mono text-xs text-mutedtext">
                No password. No CV. No selling your data. Ever.
              </p>
            </div>

            {/* Annotated conversation hero visual */}
            <div className="relative animate-scale-in">
              <div className="rounded-2xl bg-beige-100 p-6 shadow-sm md:p-8">
                <div className="space-y-4">
                  {/* Her message */}
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-charcoal shadow-sm">
                      <AnnotatedCircle className="font-medium">
                        What do you do for fun?
                      </AnnotatedCircle>
                    </div>
                  </div>
                  {/* Coach annotation */}
                  <div className="pl-4">
                    <StickyNote arrow="left">
                      She&apos;s testing if you&apos;re interesting beyond the profile.
                    </StickyNote>
                  </div>
                  {/* His message */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-beige-400 px-4 py-3 text-sm text-charcoal shadow-sm">
                      I climb, read weird books, and cook things that
                      <AnnotatedUnderline> don&apos;t always work out</AnnotatedUnderline>.
                      You?
                    </div>
                  </div>
                  {/* Coach suggestion */}
                  <div className="pr-4 text-right">
                    <StickyNote arrow="right">
                      Good — specific, vulnerable, and ended with a question.
                    </StickyNote>
                  </div>
                </div>
              </div>
              {/* Floating annotation */}
              <div className="absolute -right-2 -top-2 rotate-3 md:-right-4">
                <StickyNote arrow="none" className="bg-coral text-cream">
                  This is the whole product.
                </StickyNote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core loop section */}
      <section className="border-y border-beige-200 bg-beige-50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-coral">
              The core loop
            </p>
            <h2 className="text-balance font-serif text-3xl font-bold text-charcoal md:text-4xl">
              How coaching works in real time
            </h2>
            <p className="mt-4 text-lg text-mutedtext">
              Four steps, every message. You stay in control — the coach just makes sure
              you never stare at the screen wondering what to say.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { step: '01', title: 'She says something', desc: 'Paste her message or upload a screenshot. The coach reads it instantly.' },
              { step: '02', title: 'Get the read', desc: 'What she actually means, what signal she\'s sending, and why it matters right now.' },
              { step: '03', title: 'One next move', desc: 'Not ten options. One grounded suggestion — with the reasoning, not just the line.' },
              { step: '04', title: 'Send it, get feedback', desc: 'Paste your draft. The coach tells you if it works before you hit send.' },
            ].map((item, i) => (
              <div key={item.step} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="mb-3 font-mono text-xs text-coral">{item.step}</div>
                <h3 className="mb-2 font-serif text-lg font-bold text-charcoal">{item.title}</h3>
                <p className="text-sm leading-relaxed text-mutedtext">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-coral">
            What&apos;s inside
          </p>
          <h2 className="text-balance font-serif text-3xl font-bold text-charcoal md:text-4xl">
            Three things that actually change your results
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-beige-200 bg-white p-6 transition-shadow hover:shadow-md md:p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-beige-100">
              <MessageCircle className="h-6 w-6 text-coral" />
            </div>
            <h3 className="mb-3 font-serif text-xl font-bold text-charcoal">Conversation Coach</h3>
            <p className="text-sm leading-relaxed text-mutedtext">
              Real-time coaching on live conversations. Not scripts — context-aware
              guidance that adapts to who you&apos;re talking to and where you are in the thread.
            </p>
          </div>
          <div className="rounded-2xl border border-beige-200 bg-white p-6 transition-shadow hover:shadow-md md:p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-beige-100">
              <BookOpen className="h-6 w-6 text-sage" />
            </div>
            <h3 className="mb-3 font-serif text-xl font-bold text-charcoal">Learning</h3>
            <p className="text-sm leading-relaxed text-mutedtext">
              Practice scenarios, quick quizzes, and Q&amp;A — built around your persona.
              Get better between conversations, not just during them.
            </p>
          </div>
          <div className="rounded-2xl border border-beige-200 bg-white p-6 transition-shadow hover:shadow-md md:p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-beige-100">
              <TrendingUp className="h-6 w-6 text-beige-800" />
            </div>
            <h3 className="mb-3 font-serif text-xl font-bold text-charcoal">Growth View</h3>
            <p className="text-sm leading-relaxed text-mutedtext">
              Not a score. A perceptive friend who tells you what your patterns are —
              where you stall, what works, and what to try next.
            </p>
          </div>
        </div>
      </section>

      {/* Coach credibility */}
      <section className="border-y border-beige-200 bg-beige-50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
          <div className="mb-12 max-w-2xl">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-coral">
              Built with real coaches
            </p>
            <h2 className="text-balance font-serif text-3xl font-bold text-charcoal md:text-4xl">
              Not a chatbot wrapped in a UI
            </h2>
            <p className="mt-4 text-lg text-mutedtext">
              Our coaching logic is shaped by people who do this for a living.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COACHES.map((coach) => (
              <div key={coach.name} className="rounded-xl border border-beige-200 bg-white p-5">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-beige-200 font-serif text-lg font-bold text-beige-900">
                  {coach.name.charAt(0)}
                </div>
                <h3 className="font-semibold text-charcoal">{coach.name}</h3>
                <p className="text-sm text-mutedtext">{coach.role}</p>
                <p className="mt-1 font-mono text-xs text-coral">{coach.credential}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-coral">
            Pricing
          </p>
          <h2 className="text-balance font-serif text-3xl font-bold text-charcoal md:text-4xl">
            Start free. Upgrade when it works.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl border p-6 md:p-8 ${
                tier.highlight
                  ? 'border-coral bg-beige-100 shadow-sm'
                  : tier.locked
                    ? 'border-beige-200 bg-white opacity-75'
                    : 'border-beige-200 bg-white'
              }`}
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
                <span className="font-serif text-3xl font-bold text-charcoal">{tier.price}</span>
                <span className="text-sm text-mutedtext">/ {tier.period}</span>
              </div>
              <p className="mt-2 text-sm text-mutedtext">{tier.description}</p>
              <ul className="mt-6 space-y-3">
                {tier.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-charcoal">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.locked ? '/pricing' : '/onboarding'}
                className={`mt-6 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                  tier.highlight
                    ? 'bg-coral text-cream hover:bg-coral-dark'
                    : 'border border-beige-300 text-charcoal hover:bg-beige-100'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-beige-200 bg-beige-900">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center md:px-8 md:py-24">
          <h2 className="text-balance font-serif text-3xl font-bold text-cream md:text-4xl">
            Stop staring at the screen.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-beige-200">
            Your coach is ready. Takes under two minutes to set up.
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-coral px-8 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-coral-light"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-beige-200 bg-cream">
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <span className="font-serif text-lg font-bold text-charcoal">{BRAND.name}</span>
            <p className="font-mono text-xs text-mutedtext">
              {BRAND.tagline}
            </p>
          </div>
          <div className="mt-8 flex flex-col items-center gap-2 md:flex-row md:justify-between">
            <p className="font-mono text-xs text-mutedtext">
              © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/pricing" className="text-sm text-mutedtext hover:text-charcoal">Pricing</Link>
              <span className="text-sm text-mutedtext">Privacy</span>
              <span className="text-sm text-mutedtext">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
