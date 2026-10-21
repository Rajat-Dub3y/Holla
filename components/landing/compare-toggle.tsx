'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { StickyNote } from '@/components/annotated-text';
import { useAppear } from './reveal';
import { COMPARE } from './content';

/** Same moment, two outcomes. Flip the switch. */
export function CompareToggle() {
  const [coached, setCoached] = useState(false);
  const side = coached ? COMPARE.with : COMPARE.without;

  return (
    <div className="mx-auto max-w-2xl">
      <div
        role="group"
        aria-label="Compare"
        className="mx-auto mb-6 flex w-fit rounded-full border border-beige-300 bg-beige-50 p-1"
      >
        {[false, true].map((v) => (
          <button
            key={String(v)}
            onClick={() => setCoached(v)}
            aria-pressed={coached === v}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
              coached === v ? 'bg-coral text-cream' : 'text-mutedtext hover:text-charcoal'
            )}
          >
            {v ? COMPARE.with.label : COMPARE.without.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-beige-100 p-5 shadow-sm md:p-8">
        <Scene key={String(coached)} coached={coached} draft={side.draft} outcome={side.outcome} />
      </div>
    </div>
  );
}

function Scene({
  coached,
  draft,
  outcome,
}: {
  coached: boolean;
  draft: string;
  outcome: string;
}) {
  const on = useAppear(250);
  return (
    <div className={cn('space-y-4', on && 'lp-in')}>
      <div className="flex justify-start">
        <div className="max-w-[60%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm font-medium text-charcoal shadow-sm">
          {COMPARE.her}
        </div>
      </div>
      <div className="flex justify-end">
        <div className="lp-pop max-w-[85%] rounded-2xl rounded-tr-sm bg-beige-400 px-4 py-3 text-sm text-charcoal shadow-sm">
          {coached ? draft : <span className="lp-strike">{draft}</span>}
        </div>
      </div>
      <div className={coached ? 'pr-4 text-right' : 'pl-4'}>
        <StickyNote arrow={coached ? 'right' : 'left'}>{outcome}</StickyNote>
      </div>
    </div>
  );
}
