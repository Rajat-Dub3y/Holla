'use client';

import Link from 'next/link';
import { ArrowRight, MessageCircle, BookOpen, Lightbulb } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { CreditPill } from '@/components/credit-pill';
import { BRAND, PERSONAS } from '@/lib/brand';
import { mockLearningScenarios } from '@/lib/mock-data';
import { useMe } from '@/lib/use-me';

export default function CoachPage() {
  const { profile } = useMe();
  const persona = PERSONAS[profile?.persona ?? 'entrepreneur'];
  const practiceScenarios = mockLearningScenarios.filter((s) => s.type === 'practice');
  const quizScenarios = mockLearningScenarios.filter((s) => s.type === 'quiz');

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-6 md:px-8 md:py-10">
        {/* Mobile top bar */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <span className="font-serif text-xl font-bold text-charcoal">{BRAND.name}</span>
          <CreditPill credits={profile?.credits ?? 0} />
        </div>

        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-widest text-coral">
            Coach
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-charcoal md:text-4xl">
            What do you want to work on?
          </h1>
          <p className="mt-2 text-sm text-mutedtext">
            {persona.dashboardTone} Pick a scenario or jump into a live conversation.
          </p>
        </div>

        {/* Quick actions */}
        <div className="mb-10 grid gap-4 md:grid-cols-2">
          <Link
            href="/chat"
            className="group flex items-center justify-between rounded-2xl bg-beige-400 p-5 transition-shadow hover:shadow-md"
          >
            <div>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-coral/15">
                <MessageCircle className="h-5 w-5 text-coral" />
              </div>
              <h2 className="font-serif text-lg font-bold text-charcoal">
                Coach a live conversation
              </h2>
              <p className="mt-1 text-xs text-beige-900/70">
                Paste her message and get real-time coaching
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-charcoal transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/learn"
            className="group flex items-center justify-between rounded-2xl border border-beige-200 bg-white p-5 transition-shadow hover:shadow-sm"
          >
            <div>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sage/15">
                <BookOpen className="h-5 w-5 text-sage" />
              </div>
              <h2 className="font-serif text-lg font-bold text-charcoal">
                Practice scenarios
              </h2>
              <p className="mt-1 text-xs text-mutedtext">
                Warm up before the real thing
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-mutedtext transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Practice scenarios */}
        <div className="mb-10">
          <h2 className="mb-4 font-serif text-lg font-bold text-charcoal">
            Practice
          </h2>
          <div className="space-y-3">
            {practiceScenarios.map((scenario) => (
              <Link
                key={scenario.id}
                href="/learn"
                className="group flex items-center justify-between rounded-xl border border-beige-200 bg-white p-4 transition-all hover:border-beige-300 hover:shadow-sm"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-coral/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-coral">
                      Practice
                    </span>
                    <span className="font-mono text-[10px] text-mutedtext">
                      {scenario.difficulty}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-charcoal">
                    {scenario.title}
                  </h3>
                  <p className="mt-1 text-xs text-mutedtext">{scenario.description}</p>
                </div>
                <ArrowRight className="ml-3 h-4 w-4 shrink-0 text-mutedtext transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>

        {/* Quick quizzes */}
        <div className="mb-10">
          <h2 className="mb-4 font-serif text-lg font-bold text-charcoal">
            Quick reads
          </h2>
          <div className="space-y-3">
            {quizScenarios.map((scenario) => (
              <Link
                key={scenario.id}
                href="/learn"
                className="group flex items-center justify-between rounded-xl border border-beige-200 bg-white p-4 transition-all hover:border-beige-300 hover:shadow-sm"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-sage/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sage-dark">
                      Quiz
                    </span>
                    <span className="font-mono text-[10px] text-mutedtext">
                      {scenario.difficulty}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-charcoal">
                    {scenario.title}
                  </h3>
                  <p className="mt-1 text-xs text-mutedtext">{scenario.description}</p>
                </div>
                <ArrowRight className="ml-3 h-4 w-4 shrink-0 text-mutedtext transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>

        {/* Persona insight */}
        <div className="flex items-start gap-3 rounded-xl border border-beige-200 bg-beige-50 p-4">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral/15">
            <Lightbulb className="h-3.5 w-3.5 text-coral" />
          </div>
          <p className="text-sm text-charcoal">
            <span className="font-semibold">Coach tip:</span> You&apos;re an{' '}
            {persona.label.toLowerCase()} — your edge is {persona.tagline.toLowerCase()}.
            Practice scenarios tagged for your persona will sharpen what you&apos;re
            already good at, not just fix what&apos;s broken.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
