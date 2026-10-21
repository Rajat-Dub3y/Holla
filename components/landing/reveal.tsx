'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** True once the element has scrolled into view (fires once). */
export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, seen] as const;
}

/** Flips to true one frame after mount, so CSS transitions play on remount. */
export function useAppear(delayMs = 0) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 30 + delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return on;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Fades/slides children in when scrolled into view. Children with .lp-sweep / .lp-strike animate too. */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li';
}) {
  const [ref, seen] = useInView<HTMLDivElement>(0.15);
  return (
    <Tag
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn('lp-reveal', seen && 'lp-in', className)}
    >
      {children}
    </Tag>
  );
}

/** Hand-drawn circle that sweeps around a phrase. `on` controls when it draws. */
export function Ring({
  children,
  on,
  className,
}: {
  children: ReactNode;
  on?: boolean;
  className?: string;
}) {
  const appeared = useAppear(350);
  const draw = on ?? appeared;
  return (
    <span className={cn('relative inline-block', className)}>
      <span
        aria-hidden
        className={cn(
          'lp-circle pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-full border-2 border-coral/60',
          draw && 'lp-on'
        )}
      />
      <span className="relative">{children}</span>
    </span>
  );
}

/** Coral highlighter bar that sweeps under a phrase. */
export function Marker({
  children,
  on = false,
  className,
}: {
  children: ReactNode;
  on?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('relative inline-block', className)}>
      <span
        aria-hidden
        className={cn(
          'lp-sweep pointer-events-none absolute inset-x-0 bottom-0.5 h-2 bg-coral/25',
          on && 'lp-on'
        )}
      />
      <span className="relative">{children}</span>
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 font-mono text-xs uppercase tracking-widest text-coral">{children}</p>
  );
}
