'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUIZ } from './content';

/** Three-question "what does this signal?" quiz. */
export function SignalQuiz() {
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = q >= QUIZ.length;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (QUIZ[q].options[i].correct) setScore((s) => s + 1);
  };

  const next = () => {
    setPicked(null);
    setQ((n) => n + 1);
  };

  const restart = () => {
    setQ(0);
    setPicked(null);
    setScore(0);
  };

  if (done) {
    const verdict =
      score === QUIZ.length
        ? 'You read signals well. The coach is for the times you are too close to see them.'
        : score >= 1
          ? 'Not bad. Signals are easy to misread when you care about the answer.'
          : 'Totally normal. This is exactly what the coach is for.';
    return (
      <div className="lp-pop rounded-2xl bg-beige-100 p-6 text-center shadow-sm md:p-10">
        <p className="font-mono text-xs uppercase tracking-widest text-coral">Your score</p>
        <p className="mt-2 font-serif text-5xl font-bold text-charcoal">
          {score}/{QUIZ.length}
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm text-mutedtext">{verdict}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark"
          >
            Get coached on real chats
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={restart}
            className="rounded-lg border border-beige-300 px-6 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-beige-50"
          >
            Play again
          </button>
        </div>
      </div>
    );
  }

  const cur = QUIZ[q];

  return (
    <div className="rounded-2xl bg-beige-100 p-5 shadow-sm md:p-8">
      <div className="mb-5 flex items-center justify-between font-mono text-xs text-mutedtext">
        <span>
          Question {q + 1} of {QUIZ.length}
        </span>
        <span>Score {score}</span>
      </div>

      <div key={q} className="lp-pop">
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm font-medium text-charcoal shadow-sm">
          {cur.her}
        </div>

        <p className="mb-3 mt-6 text-sm font-semibold text-charcoal">What does this signal?</p>
        <div className="space-y-2">
          {cur.options.map((o, i) => {
            const revealed = picked !== null;
            const isPicked = picked === i;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={revealed}
                className={cn(
                  'w-full rounded-xl border p-4 text-left text-sm transition-all',
                  revealed && o.correct && 'border-sage bg-sage/10',
                  revealed && isPicked && !o.correct && 'border-coral/60 bg-coral/5',
                  !revealed &&
                    'border-beige-200 bg-white hover:-translate-y-0.5 hover:border-beige-300 hover:shadow-sm',
                  revealed && !o.correct && !isPicked && 'border-beige-200 bg-white opacity-60'
                )}
              >
                <span className="text-charcoal">{o.text}</span>
                {revealed && (isPicked || o.correct) && (
                  <span className="mt-2 block text-xs text-mutedtext">{o.why}</span>
                )}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <button
            onClick={next}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark"
          >
            {q < QUIZ.length - 1 ? 'Next' : 'See score'}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
