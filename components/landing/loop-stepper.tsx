'use client';

import { useEffect, useState } from 'react';
import { StickyNote } from '@/components/annotated-text';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from './reveal';
import { LOOP_STEPS } from './content';

const STEP_MS = 5500;

/** Four-step loop. Auto-advances with a progress bar; click any step to jump. */
export function LoopStepper() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (reduced || hold) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % LOOP_STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [active, reduced, hold]);

  return (
    <div
      className="grid gap-8 md:grid-cols-2 md:gap-12"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      <ol className="space-y-2">
        {LOOP_STEPS.map((s, i) => (
          <li key={s.n}>
            <button
              onClick={() => setActive(i)}
              aria-current={i === active ? 'step' : undefined}
              className={cn(
                'relative w-full overflow-hidden rounded-xl border p-4 text-left transition-all',
                i === active
                  ? 'border-beige-300 bg-white shadow-sm'
                  : 'border-transparent hover:bg-beige-100'
              )}
            >
              <span className="font-mono text-xs text-coral">{s.n}</span>
              <h3 className="font-serif text-lg font-bold text-charcoal">{s.title}</h3>
              {i === active && (
                <p className="mt-1 text-sm leading-relaxed text-mutedtext">{s.desc}</p>
              )}
              {i === active && !reduced && !hold && (
                <span
                  key={`bar-${active}`}
                  aria-hidden
                  className="lp-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-coral"
                  style={{ animationDuration: `${STEP_MS}ms` }}
                />
              )}
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl bg-beige-100 p-6 shadow-sm md:p-8" aria-live="polite">
        <div key={active} className="lp-pop min-h-[220px] space-y-4">
          {active === 0 && <StepPaste />}
          {active === 1 && <StepRead />}
          {active === 2 && <StepMove />}
          {active === 3 && <StepFeedback />}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: string }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-coral">{children}</span>
  );
}

function StepPaste() {
  return (
    <>
      <Label>Paste or upload</Label>
      <div className="rounded-xl border border-dashed border-beige-300 bg-white p-4 text-sm text-charcoal">
        <span className="text-mutedtext">Her message: </span>
        she said &quot;ok&quot; after I asked her out
        <span className="lp-caret ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-charcoal" />
      </div>
      <div className="inline-flex rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-cream">
        Read it
      </div>
    </>
  );
}

function StepRead() {
  return (
    <>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-charcoal shadow-sm">
        ok
      </div>
      <div className="rounded-lg border-l-2 border-coral bg-beige-50 px-3 py-2.5">
        <Label>Signal</Label>
        <p className="mt-1 text-sm leading-relaxed text-charcoal">
          Low energy, but she did not say no. She is unsure, not uninterested. Make it easier to say yes.
        </p>
      </div>
    </>
  );
}

function StepMove() {
  return (
    <>
      <div className="rounded-lg border-l-2 border-coral bg-beige-50 px-3 py-2.5">
        <Label>Next move</Label>
        <p className="mt-1 text-sm leading-relaxed text-charcoal">
          Lower the stakes and give her a specific, easy plan.
        </p>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-beige-400 px-4 py-3 text-sm text-charcoal shadow-sm">
          Totally casual. Coffee Saturday, 45 minutes, and if it is not fun I will pay for the awkwardness.
        </div>
      </div>
    </>
  );
}

function StepFeedback() {
  return (
    <>
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-beige-400 px-4 py-3 text-sm text-charcoal shadow-sm">
          Totally casual. Coffee Saturday, 45 minutes.
        </div>
      </div>
      <div className="pr-4 text-right">
        <StickyNote arrow="right">Good. Specific, low pressure, and easy to say yes to.</StickyNote>
      </div>
    </>
  );
}
