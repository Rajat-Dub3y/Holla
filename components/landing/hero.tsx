'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { StickyNote } from '@/components/annotated-text';
import { Ring, usePrefersReducedMotion } from './reveal';
import { HERO_SCENES, HERO_VIDEO_POSTER, HERO_VIDEO_SRC, MARQUEE_WORDS } from './content';

export function Hero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);

  // Respect reduced motion: start paused.
  useEffect(() => {
    if (reduced) {
      videoRef.current?.pause();
      setPlaying(false);
    }
  }, [reduced]);

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => undefined);
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <section className="relative min-h-[92vh] overflow-hidden bg-beige-100">
        {/* Looping, muted background video, warmed toward the palette */}
        {!videoFailed && (
          <video
            ref={videoRef}
            className="lp-video absolute inset-0 h-full w-full object-cover"
            autoPlay={!reduced}
            muted
            loop
            playsInline
            preload="metadata"
            poster={HERO_VIDEO_POSTER || undefined}
            onError={() => setVideoFailed(true)}
            aria-hidden
          >
            <source src={HERO_VIDEO_SRC} type="video/mp4" />
          </video>
        )}
        {/* Flat cream wash so text stays readable (no gradients, per the design rules) */}
        <div className="absolute inset-0 bg-cream/80" aria-hidden />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-32 md:grid-cols-2 md:gap-16 md:px-8 md:pt-40 lg:pb-28">
          <div>
            <p
              className="lp-rise mb-4 font-mono text-xs uppercase tracking-widest text-coral"
              style={{ animationDelay: '0ms' }}
            >
              Not a reply generator. A coach.
            </p>
            <h1
              className="lp-rise text-balance font-serif text-4xl font-bold leading-tight text-charcoal md:text-5xl lg:text-6xl"
              style={{ animationDelay: '120ms' }}
            >
              You get matches.
              <br />
              <span className="text-coral">But no dates?</span>
            </h1>
            <p
              className="lp-rise mt-6 max-w-md text-lg leading-relaxed text-charcoal/75"
              style={{ animationDelay: '260ms' }}
            >
              {BRAND.name} sits beside you through real conversations. It reads what she said,
              explains what it means, suggests one grounded next move, and helps you get the date.
            </p>
            <div
              className="lp-rise mt-8 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: '400ms' }}
            >
              <a
                href="#try-it"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark"
              >
                Try it right now
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-lg border border-charcoal/30 bg-cream/60 px-6 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-cream"
              >
                Get started free
              </Link>
            </div>
            <p
              className="lp-rise mt-4 font-mono text-xs text-charcoal/60"
              style={{ animationDelay: '520ms' }}
            >
              No password. No CV. No selling your data.
            </p>
          </div>

          <div className="lp-rise" style={{ animationDelay: '300ms' }}>
            <LiveCard reduced={reduced} />
          </div>
        </div>

        <button
          type="button"
          onClick={toggleVideo}
          aria-label={playing ? 'Pause background video' : 'Play background video'}
          className="absolute bottom-5 right-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/30 bg-cream/80 text-charcoal transition-colors hover:bg-cream"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </section>

      <Marquee />
    </>
  );
}

/** Self-playing mini conversation: she texts, the coach reads it. */
function LiveCard({ reduced }: { reduced: boolean }) {
  const [scene, setScene] = useState(0);
  // 0 = typing dots, 1 = her message, 2 = coach read shown
  const [phase, setPhase] = useState(reduced ? 2 : 0);

  useEffect(() => {
    if (reduced) {
      setPhase(2);
      return;
    }
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 1000);
    const t2 = setTimeout(() => setPhase(2), 2400);
    const t3 = setTimeout(() => setScene((s) => (s + 1) % HERO_SCENES.length), 6200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [scene, reduced]);

  const s = HERO_SCENES[scene];

  return (
    <div className="relative">
      <div className="rounded-2xl bg-beige-100 p-6 shadow-sm md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mutedtext">
            Live example
          </span>
          <span className="font-mono text-[10px] text-mutedtext">
            {scene + 1} / {HERO_SCENES.length}
          </span>
        </div>

        <div className="min-h-[190px] space-y-4" aria-live="polite">
          {phase === 0 && (
            <div className="flex justify-start" key={`dots-${scene}`}>
              <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
                <span className="lp-dot h-1.5 w-1.5 rounded-full bg-mutedtext" />
                <span className="lp-dot h-1.5 w-1.5 rounded-full bg-mutedtext" />
                <span className="lp-dot h-1.5 w-1.5 rounded-full bg-mutedtext" />
              </div>
            </div>
          )}
          {phase >= 1 && (
            <div className="lp-pop flex justify-start" key={`her-${scene}`}>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm font-medium text-charcoal shadow-sm">
                <Ring on={phase >= 2}>{s.her}</Ring>
              </div>
            </div>
          )}
          {phase >= 2 && (
            <div className="lp-pop pl-4" key={`read-${scene}`}>
              <StickyNote arrow="left">{s.read}</StickyNote>
            </div>
          )}
        </div>
      </div>
      <div className="absolute -right-2 -top-3 rotate-3 md:-right-4">
        <StickyNote arrow="none" className="bg-coral text-cream">
          This is the whole product.
        </StickyNote>
      </div>
    </div>
  );
}

function Marquee() {
  const items = [...MARQUEE_WORDS, ...MARQUEE_WORDS];
  return (
    <div className="lp-marquee overflow-hidden border-y border-beige-200 bg-beige-200 py-3" aria-hidden>
      <div className="lp-marquee-track">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center">
            {items.map((w, i) => (
              <span key={`${dup}-${i}`} className="flex items-center">
                <span className="px-6 font-mono text-xs uppercase tracking-widest text-charcoal/70">
                  {w}
                </span>
                <span className="text-coral">•</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
