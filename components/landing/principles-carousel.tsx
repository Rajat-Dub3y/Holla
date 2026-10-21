'use client';

import { useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PRINCIPLES } from './content';

/** Draggable, snap-scrolling card row with prev/next buttons. */
export function PrinciplesCarousel() {
  const rail = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });

  const scrollBy = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return; // touch uses native scrolling
    const el = rail.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = rail.current;
    if (!d.down || !el) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 3) d.moved = true;
    el.style.scrollSnapType = 'none';
    el.scrollLeft = d.startLeft - dx;
  };
  const endDrag = () => {
    drag.current.down = false;
    if (rail.current) rail.current.style.scrollSnapType = '';
  };

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <button
          onClick={() => scrollBy(-1)}
          aria-label="Previous"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-beige-300 text-charcoal transition-colors hover:bg-beige-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => scrollBy(1)}
          aria-label="Next"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-beige-300 text-charcoal transition-colors hover:bg-beige-100"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={rail}
        tabIndex={0}
        aria-label="Coaching principles"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') scrollBy(1);
          if (e.key === 'ArrowLeft') scrollBy(-1);
        }}
        className="lp-noscroll -mx-6 flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 active:cursor-grabbing md:-mx-8 md:px-8"
      >
        {PRINCIPLES.map((p) => (
          <article
            key={p.n}
            className="lp-lift w-[260px] shrink-0 snap-start select-none rounded-2xl border border-beige-200 bg-white p-6 md:w-[290px]"
          >
            <span className="font-mono text-xs text-coral">{p.n}</span>
            <h3 className="mt-6 font-serif text-xl font-bold leading-snug text-charcoal">
              {p.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-mutedtext">{p.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
