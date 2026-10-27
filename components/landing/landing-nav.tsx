'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
        scrolled ? 'border-b border-beige-200 bg-cream/90 backdrop-blur-sm' : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
        <Link href="/" className="font-serif text-xl font-bold text-charcoal">
          {BRAND.name}
        </Link>
        <nav className="flex items-center gap-2 md:gap-5" aria-label="Primary">
          <a href="/beta" className="hidden text-sm text-charcoal/70 hover:text-charcoal md:block">
            Try it
          </a>
          <a href="#how" className="hidden text-sm text-charcoal/70 hover:text-charcoal md:block">
            How it works
          </a>
          <Link
            href="/pricing"
            className="hidden text-sm text-charcoal/70 hover:text-charcoal md:block"
          >
            Pricing
          </Link>
          <Link
            href="/onboarding"
            className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark md:px-6"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
