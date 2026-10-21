import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { BRAND, PRICING_TIERS } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { LandingNav } from '@/components/landing/landing-nav';
import { Hero } from '@/components/landing/hero';
import { Eyebrow, Marker, Reveal } from '@/components/landing/reveal';
import { TryIt } from '@/components/landing/try-it';
import { LoopStepper } from '@/components/landing/loop-stepper';
import { SignalQuiz } from '@/components/landing/signal-quiz';
import { CompareToggle } from '@/components/landing/compare-toggle';
import { PrinciplesCarousel } from '@/components/landing/principles-carousel';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <LandingNav />
      <Hero />

      {/* Playable demo */}
      <section id="try-it" className="mx-auto max-w-6xl scroll-mt-16 px-6 py-16 md:px-8 md:py-24">
        <Reveal className="mb-10 max-w-2xl">
          <Eyebrow>Try it. No sign-up</Eyebrow>
          <h2 className="text-balance font-serif text-3xl font-bold text-charcoal md:text-4xl">
            She texts. You{' '}
            <Marker>pick the reply</Marker>.
          </h2>
          <p className="mt-4 text-lg text-mutedtext">
            Pick a moment, choose what you would send, and see what the coach would say about it.
          </p>
        </Reveal>
        <Reveal delay={100}>
          <TryIt />
        </Reveal>
      </section>

      {/* Core loop */}
      <section id="how" className="scroll-mt-16 border-y border-beige-200 bg-beige-50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
          <Reveal className="mb-10 max-w-2xl">
            <Eyebrow>The core loop</Eyebrow>
            <h2 className="text-balance font-serif text-3xl font-bold text-charcoal md:text-4xl">
              Four steps, every message
            </h2>
            <p className="mt-4 text-lg text-mutedtext">
              You stay in control. The coach just makes sure you never stare at the screen
              wondering what to say.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <LoopStepper />
          </Reveal>
        </div>
      </section>

      {/* Quiz */}
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <Reveal className="mb-8 text-center">
          <Eyebrow>Quick check</Eyebrow>
          <h2 className="text-balance font-serif text-3xl font-bold text-charcoal md:text-4xl">
            Can you read the <Marker>signal</Marker>?
          </h2>
          <p className="mt-4 text-mutedtext">Three texts. One honest guess each.</p>
        </Reveal>
        <Reveal delay={100}>
          <SignalQuiz />
        </Reveal>
      </section>

      {/* Compare */}
      <section className="border-y border-beige-200 bg-beige-50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
          <Reveal className="mb-10 text-center">
            <Eyebrow>Same message, different outcome</Eyebrow>
            <h2 className="text-balance font-serif text-3xl font-bold text-charcoal md:text-4xl">
              She sends &ldquo;k&rdquo;. Now what?
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <CompareToggle />
          </Reveal>
        </div>
      </section>

      {/* Principles carousel */}
      <section className="mx-auto max-w-6xl overflow-hidden px-6 py-16 md:px-8 md:py-24">
        <Reveal className="mb-6 max-w-2xl">
          <Eyebrow>What the coach teaches</Eyebrow>
          <h2 className="text-balance font-serif text-3xl font-bold text-charcoal md:text-4xl">
            Principles, not scripts
          </h2>
          <p className="mt-4 text-lg text-mutedtext">
            You learn why something works, so you can do it in your own voice. Drag to explore.
          </p>
        </Reveal>
        <Reveal delay={100}>
          <PrinciplesCarousel />
        </Reveal>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 border-t border-beige-200 bg-beige-50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
          <Reveal className="mb-10 max-w-2xl">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="text-balance font-serif text-3xl font-bold text-charcoal md:text-4xl">
              Start free. Upgrade when it earns it.
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {PRICING_TIERS.map((tier, i) => (
              <Reveal key={tier.id} delay={i * 100}>
                <div
                  className={cn(
                    'lp-lift flex h-full flex-col rounded-2xl border bg-white p-6',
                    tier.highlight ? 'border-coral shadow-sm' : 'border-beige-200',
                    tier.locked && 'opacity-75'
                  )}
                >
                  <h3 className="font-serif text-xl font-bold text-charcoal">{tier.name}</h3>
                  <p className="mt-1 text-sm text-mutedtext">{tier.description}</p>
                  <p className="mt-5 font-serif text-4xl font-bold text-charcoal">
                    {tier.price}
                    <span className="ml-1 font-sans text-sm font-normal text-mutedtext">
                      {tier.period}
                    </span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2">
                    {tier.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-charcoal">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {tier.locked ? (
                    <span className="mt-6 inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-beige-300 px-4 py-3 text-sm font-semibold text-mutedtext">
                      {tier.cta}
                    </span>
                  ) : (
                    <Link
                      href={tier.id === 'free' ? '/onboarding' : '/pricing'}
                      className={cn(
                        'mt-6 inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition-colors',
                        tier.highlight
                          ? 'bg-coral text-cream hover:bg-coral-dark'
                          : 'border border-beige-300 text-charcoal hover:bg-beige-100'
                      )}
                    >
                      {tier.cta}
                    </Link>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-beige-900">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center md:py-24">
          <Reveal>
            <h2 className="text-balance font-serif text-3xl font-bold text-cream md:text-5xl">
              Your next message is the one that gets the date.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-beige-200">
              Free to start. No password. No selling your data.
            </p>
            <Link
              href="/onboarding"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-coral px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-coral-light"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-beige-200 bg-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-mutedtext md:flex-row md:px-8">
          <span className="font-serif font-bold text-charcoal">{BRAND.name}</span>
          <nav className="flex gap-5" aria-label="Footer">
            <Link href="/privacy" className="hover:text-charcoal">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-charcoal">
              Terms
            </Link>
          </nav>
          <span className="font-mono text-xs">
            &copy; {new Date().getFullYear()} {BRAND.name}
          </span>
        </div>
      </footer>
    </div>
  );
}
