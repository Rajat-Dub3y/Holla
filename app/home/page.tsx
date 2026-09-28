'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowRight, 
  MessageCircle, 
  BookOpen, 
  Calendar, 
  UserCheck, 
  Sparkles, 
  Trophy, 
  Quote, 
  ChevronRight,
  Zap
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { CreditPill } from '@/components/credit-pill';
import { BRAND } from '@/lib/brand';
import { useMe } from '@/lib/use-me';
import { toast } from 'sonner';

const FEATURES = [
  {
    href: '/chat',
    icon: MessageCircle,
    title: 'Conversation Coach',
    desc: 'Get advice on what to say next.',
    isNew: true,
    bgImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  },
  {
    href: '/progress',
    icon: BookOpen,
    title: 'Attraction Insights',
    desc: 'Understand what really works.',
    isNew: false,
    bgImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
  },
  {
    href: '/home',
    icon: Calendar,
    title: 'Date Planner',
    desc: 'Plan the perfect date, any vibe.',
    isNew: false,
    bgImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  },
  {
    href: '/profile-optimizer',
    icon: UserCheck,
    title: 'Profile Optimizer',
    desc: 'Get more matches with proven tips.',
    isNew: false,
    bgImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
  },
];

const CHALLENGE_DAYS = [
  { day: 1, label: 'Today', active: true },
  { day: 2, label: '', active: false },
  { day: 3, label: '', active: false },
  { day: 4, label: '', active: false },
  { day: 5, label: '', active: false },
  { day: 7, label: '', active: false, isGift: true },
];

export default function HomePage() {
  const { profile, mutate } = useMe();
  const firstName = profile?.firstName ?? 'there';

  useEffect(() => {
    if (window.location.search.includes('upgraded=1')) {
      toast.success('Welcome to Premium');
      let elapsed = 0;
      const interval = window.setInterval(async () => {
        const latest = await mutate();
        elapsed += 2000;
        if (latest?.user.subscriptionTier !== 'free' || elapsed >= 10000) window.clearInterval(interval);
      }, 2000);
      return () => window.clearInterval(interval);
    }
  }, [mutate]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        
        {/* 1. Header Navigation Bar */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="font-serif text-2xl font-bold tracking-tight text-charcoal flex items-center gap-1.5">
              {BRAND.name} <Sparkles className="h-4 w-4 text-coral" />
            </span>
            <p className="font-mono text-[10px] uppercase tracking-widest text-mutedtext">
              YOUR DATING WINGMAN
            </p>
          </div>
          <div className="flex items-center gap-3">
            <CreditPill credits={profile?.credits ?? 0} />
          </div>
        </div>

        {/* 2. Top Greeting Row with Quote & Warm Avatar Frame */}
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs text-mutedtext">Good evening,</p>
            <h1 className="mt-1 flex items-center gap-2 font-serif text-3xl font-bold text-charcoal md:text-4xl">
              {firstName} <span className="text-xl">👋</span>
            </h1>
            <p className="mt-1 text-sm text-beige-900/70">
              Ready to make better moves? <br className="hidden md:inline" />
              I&apos;ve got you.
            </p>
          </div>

          {/* Coaching Quote Bubble & Avatar */}
          <div className="flex items-center gap-4">
            <div className="max-w-xs rounded-2xl border border-beige-200 bg-beige-50 p-3.5 shadow-sm">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-coral">
                Remember:
              </span>
              <p className="mt-0.5 text-xs text-charcoal">
                Confidence isn&apos;t loud. It&apos;s consistent.
              </p>
            </div>

            {/* Sage Ring Avatar */}
            <div className="relative shrink-0">
              <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-sage p-0.5 shadow-sm">
                <Image
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80"
                  alt={firstName}
                  width={64}
                  height={64}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-sage" />
            </div>
          </div>
        </div>

        {/* 3. Hero Card in Beige Tone */}
        <div className="relative overflow-hidden rounded-3xl border border-beige-200 bg-beige-100 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12">
            
            {/* Left Content Area */}
            <div className="z-10 flex flex-col justify-between p-6 md:col-span-6 md:p-10">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-cream">
                  AI COACH
                </span>
                <h2 className="mt-4 font-serif text-3xl font-bold leading-tight text-charcoal md:text-4xl">
                  Your personal <br />
                  dating coach.
                </h2>
                <p className="mt-3 text-sm text-mutedtext">
                  Real advice. Real conversations. Real results.
                </p>
              </div>

              <div className="mt-8">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-beige-400 px-6 py-3 font-semibold text-charcoal shadow-sm transition-all hover:bg-beige-500 hover:gap-3"
                >
                  Start a Conversation
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right Hero Image */}
            <div className="relative min-h-[260px] md:col-span-6 md:min-h-[360px]">
              <Image
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80"
                alt="AI Dating Coach"
                fill
                className="object-cover object-top"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-beige-100 via-beige-100/20 to-transparent md:bg-gradient-to-r md:from-beige-100 md:via-transparent md:to-transparent" />
            </div>
          </div>
        </div>

        {/* 4. Action Grid Section Label */}
        <div className="mb-4 mt-10 flex items-center justify-between">
          <h3 className="font-serif text-xl font-bold text-charcoal">
            What&apos;s your move today?
          </h3>
          <Link
            href="/features"
            className="flex items-center text-xs font-semibold text-mutedtext hover:text-charcoal"
          >
            See all <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 4 Cards Photo Grid with Warm Overlays */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {FEATURES.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group relative flex h-72 flex-col justify-between overflow-hidden rounded-2xl border border-beige-200 bg-charcoal p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              {/* Card Image Overlay with Soft Dark Contrast for Text */}
              <Image
                src={feature.bgImage}
                alt={feature.title}
                fill
                className="object-cover opacity-60 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent" />

              {/* Top Row inside Card */}
              <div className="relative z-10 flex items-center justify-between">
                {feature.isNew ? (
                  <span className="rounded-full bg-cream/90 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wide text-charcoal">
                    NEW
                  </span>
                ) : (
                  <span />
                )}
              </div>

              {/* Bottom Content inside Card */}
              <div className="relative z-10">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 backdrop-blur-md">
                  <feature.icon className="h-4 w-4 text-cream" />
                </div>
                <h4 className="font-serif text-base font-bold text-cream">
                  {feature.title}
                </h4>
                <p className="mt-1 text-xs text-beige-200/80 line-clamp-2">
                  {feature.desc}
                </p>
                <div className="mt-3 flex justify-end">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-1">
                    <ArrowRight className="h-3 w-3 text-cream" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 5. 7-Day Challenge Module */}
        <div className="mt-8 rounded-2xl border border-beige-200 bg-beige-50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-coral" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-coral">
              7 DAY CHALLENGE
            </span>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="font-serif text-lg font-bold text-charcoal">
                Level up your game.
              </h4>
              <p className="text-xs text-mutedtext">
                Small daily steps, big attraction
              </p>
            </div>

            {/* Steps Timeline Indicator */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              {CHALLENGE_DAYS.map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      item.active
                        ? 'border-2 border-charcoal bg-white text-charcoal shadow-sm'
                        : item.isGift
                        ? 'border border-beige-300 bg-beige-100 text-beige-800'
                        : 'border border-beige-200 bg-beige-100/50 text-beige-600'
                    }`}
                  >
                    {item.isGift ? <Sparkles className="h-4 w-4 text-coral" /> : item.day}
                  </div>
                  {item.label && (
                    <span className="font-mono text-[10px] text-mutedtext">
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Daily Insight Quote Banner */}
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-beige-200 bg-beige-100/60 p-5">
          <Quote className="h-6 w-6 shrink-0 text-beige-700" />
          <div>
            <p className="text-xs italic text-charcoal md:text-sm">
              &ldquo;The best conversations start with genuine curiosity.&rdquo;
            </p>
            <span className="mt-1 block font-mono text-[10px] text-mutedtext">
              — {BRAND.name} Coach
            </span>
          </div>
        </div>

      </div>
    </AppShell>
  );
}