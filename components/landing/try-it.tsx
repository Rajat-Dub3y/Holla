'use client';

import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { StickyNote } from '@/components/annotated-text';
import { cn } from '@/lib/utils';
import { Ring } from './reveal';
import { TRY_SCENARIOS } from './content';

/** Playable demo: pick a moment, pick your reply, get the coach's read. */
export function TryIt() {
  const [sid, setSid] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const sc = TRY_SCENARIOS[sid];
  const option = picked !== null ? sc.options[picked] : null;

  const switchScenario = (i: number) => {
    setSid(i);
    setPicked(null);
  };

  // Split her message so the key phrase can be ringed.
  const idx = sc.her.toLowerCase().indexOf(sc.ring.toLowerCase());
  const before = idx >= 0 ? sc.her.slice(0, idx) : sc.her;
  const ringed = idx >= 0 ? sc.her.slice(idx, idx + sc.ring.length) : '';
  const after = idx >= 0 ? sc.her.slice(idx + sc.ring.length) : '';

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr] md:gap-10">
      {/* Scenario picker */}
      <div
        role="tablist"
        aria-label="Pick a moment"
        className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible"
      >
        {TRY_SCENARIOS.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={i === sid}
            onClick={() => switchScenario(i)}
            className={cn(
              'shrink-0 rounded-xl border px-4 py-3 text-left text-sm transition-all',
              i === sid
                ? 'border-coral bg-white font-semibold text-charcoal shadow-sm'
                : 'border-beige-200 bg-beige-50 text-mutedtext hover:border-beige-300 hover:text-charcoal'
            )}
          >
            <span className="mb-0.5 block font-mono text-[10px] uppercase tracking-wider text-coral">
              Moment {i + 1}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Conversation */}
      <div className="rounded-2xl bg-beige-100 p-5 shadow-sm md:p-8" key={sc.id}>
        <div className="space-y-4">
          <div className="lp-pop flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm font-medium text-charcoal shadow-sm">
              {before}
              {ringed && <Ring>{ringed}</Ring>}
              {after}
            </div>
          </div>

          <div className="lp-pop pl-4" style={{ animationDelay: '250ms' }}>
            <StickyNote arrow="left">{sc.signal}</StickyNote>
          </div>
        </div>

        <p className="mb-3 mt-8 font-mono text-[10px] uppercase tracking-wider text-mutedtext">
          Your move. Pick a reply
        </p>
        <div className="space-y-2">
          {sc.options.map((o, i) => (
            <button
              key={i}
              onClick={() => setPicked(i)}
              className={cn(
                'w-full rounded-xl border p-4 text-left text-sm transition-all',
                picked === i
                  ? o.good
                    ? 'border-sage bg-sage/10'
                    : 'border-coral/60 bg-coral/5'
                  : 'border-beige-200 bg-white hover:-translate-y-0.5 hover:border-beige-300 hover:shadow-sm'
              )}
            >
              <span className={picked === i ? 'text-charcoal' : 'text-charcoal/80'}>{o.text}</span>
            </button>
          ))}
        </div>

        {option && (
          <div
            key={`${sid}-${picked}`}
            className="lp-pop mt-4 rounded-xl border-l-2 border-coral bg-beige-50 p-4"
            aria-live="polite"
          >
            <div className="flex items-center gap-1.5">
              {option.good ? (
                <Check className="h-3.5 w-3.5 text-sage" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5 text-coral" />
              )}
              <span
                className={cn(
                  'font-mono text-[10px] uppercase tracking-wider',
                  option.good ? 'text-sage-dark' : 'text-coral'
                )}
              >
                {option.good ? 'This works' : 'Try another'}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-charcoal">{option.feedback}</p>
            {option.good && TRY_SCENARIOS[sid + 1] && (
              <button
                onClick={() => switchScenario(sid + 1)}
                className="mt-3 text-xs font-semibold text-coral hover:underline"
              >
                Next moment
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
