'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Apple, Check } from 'lucide-react';
import { BRAND, ALL_VIBE_TAGS, COACHES } from '@/lib/brand';
import type { VibeTag } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

type Step = 'hook' | 'signin' | 'why' | 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'ready';

const QUESTION_STEPS: Step[] = ['q1', 'q2', 'q3', 'q4', 'q5'];
const ALL_STEPS: Step[] = ['hook', 'signin', 'why', ...QUESTION_STEPS, 'ready'];

const DATING_APPS = ['Hinge', 'Bumble', 'Tinder', 'Coffee Meets Bagel', 'The League', 'Raya'];
const COMM_STYLES = [
  { id: 'direct', label: 'Direct and confident', why: 'So the coach matches your energy' },
  { id: 'thoughtful', label: 'Thoughtful but I overthink', why: 'So the coach helps you decide faster' },
  { id: 'playful', label: 'Playful and casual', why: 'So the coach keeps it light' },
  { id: 'quiet', label: 'Quiet until I warm up', why: 'So the coach gives you low-pressure moves' },
];
const FOCUS_AREAS = [
  { id: 'openers', label: 'Starting conversations', why: 'Your first message matters most' },
  { id: 'keeping', label: 'Keeping them going', why: 'Where most threads die' },
  { id: 'dates', label: 'Moving to a date', why: 'The whole point, right?' },
  { id: 'confidence', label: 'Not knowing what to say', why: 'We&apos;ve all been there' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('hook');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedVibes, setSelectedVibes] = useState<VibeTag[]>([]);
  const [commStyle, setCommStyle] = useState<string>('');
  const [focus, setFocus] = useState<string>('');
  const [routing, setRouting] = useState<'match' | 'practice'>('match');
  const [signingIn, setSigningIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const finishSignIn = async (firebaseUser: User) => {
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: await firebaseUser.getIdToken() }),
    });
    if (!response.ok) throw new Error('Could not create your account. Please try again.');
    const session = await response.json() as { isNewUser: boolean };
    if (!session.isNewUser) {
      const profile = await apiFetch<{ persona: unknown | null }>('/api/user/me');
      if (profile.persona) {
        router.replace('/home');
        return;
      }
    }
    setStep('why');
  };

  useEffect(() => {
    getRedirectResult(auth).then((result) => {
      if (result) return finishSignIn(result.user);
    }).catch(() => toast.error('Sign-in did not complete. Please try again.'));
  }, []);

  const signInWithGoogle = async () => {
    setSigningIn(true);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await finishSignIn(result.user);
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Could not sign in. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const submitOnboarding = async () => {
    setSubmitting(true);
    try {
      const appValues = Array.from(new Set(selectedApps.map((app) => {
        const normalized = app.toLowerCase();
        return ['tinder', 'hinge', 'bumble'].includes(normalized) ? normalized : 'other';
      })));
      await apiFetch('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          apps: appValues,
          vibes: selectedVibes,
          commStyle,
          focus,
          routing,
        }),
      });
      router.push(routing === 'practice' ? '/learn' : '/chat');
    } catch {
      toast.error('Could not save your preferences. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = ALL_STEPS.indexOf(step);
  const questionIndex = QUESTION_STEPS.indexOf(step);

  const next = () => {
    const idx = ALL_STEPS.indexOf(step);
    if (idx < ALL_STEPS.length - 1) {
      setStep(ALL_STEPS[idx + 1]);
    }
  };

  const back = () => {
    const idx = ALL_STEPS.indexOf(step);
    if (idx > 0) setStep(ALL_STEPS[idx - 1]);
  };

  const toggleApp = (app: string) => {
    setSelectedApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  const toggleVibe = (vibe: VibeTag) => {
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  const canProceed = () => {
    if (step === 'q1') return selectedApps.length > 0;
    if (step === 'q2') return selectedVibes.length > 0;
    if (step === 'q3') return !!commStyle;
    if (step === 'q4') return !!focus;
    return true;
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Progress dots — only during questionnaire */}
      {questionIndex >= 0 && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-cream/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-6 py-4">
            {QUESTION_STEPS.map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === questionIndex ? 'w-8 bg-coral' : i < questionIndex ? 'w-1.5 bg-coral/40' : 'w-1.5 bg-beige-300'
                )}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-6 py-8 md:px-8 md:py-16">
        <div key={step} className="animate-fade-in">
          {/* Step 1: The Hook */}
          {step === 'hook' && (
            <div className="flex min-h-[80vh] flex-col justify-center text-center">
              <p className="mb-6 font-mono text-xs uppercase tracking-widest text-coral">
                {BRAND.name}
              </p>
              <h1 className="text-balance font-serif text-4xl font-bold leading-tight text-charcoal md:text-5xl lg:text-6xl">
                You get matches.
                <br />
                <span className="text-coral">But no dates?</span>
              </h1>
              <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-mutedtext">
                The problem isn&apos;t your profile. It&apos;s what happens after the match.
                {BRAND.name} coaches you through real conversations — so you actually get
                the date.
              </p>
              <div className="mt-10 flex flex-col items-center gap-3">
                <button
                  onClick={next}
                  className="inline-flex items-center gap-2 rounded-lg bg-coral px-8 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark"
                >
                  See how it works
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="font-mono text-xs text-mutedtext">Takes under 2 minutes</p>
              </div>
            </div>
          )}

          {/* Step 2: Sign In */}
          {step === 'signin' && (
            <div className="flex min-h-[80vh] flex-col justify-center">
              <div className="mx-auto w-full max-w-sm">
                <h1 className="text-center font-serif text-3xl font-bold text-charcoal">
                  Sign in
                </h1>
                <p className="mt-2 text-center text-sm text-mutedtext">
                  No password. No CV.
                </p>
                <div className="mt-8 space-y-3">
                  <button
                    onClick={() => toast.info('Apple sign-in coming soon')}
                    className="flex w-full items-center justify-center gap-3 rounded-xl bg-charcoal px-4 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <Apple className="h-5 w-5" />
                    Continue with Apple
                  </button>
                  <button
                    onClick={signInWithGoogle}
                    disabled={signingIn}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-beige-300 bg-white px-4 py-3.5 text-sm font-semibold text-charcoal transition-colors hover:bg-beige-50"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {signingIn ? 'Signing in...' : 'Continue with Google'}
                  </button>
                </div>
                <p className="mt-6 text-center font-mono text-xs text-mutedtext">
                  No spam. No selling your data. Ever.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Why It Works */}
          {step === 'why' && (
            <div className="flex min-h-[80vh] flex-col justify-center">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-coral">
                Why it works
              </p>
              <h1 className="text-balance font-serif text-3xl font-bold leading-tight text-charcoal md:text-4xl">
                We did the work so you don&apos;t have to
              </h1>
              <p className="mt-4 text-lg text-mutedtext">
                Years of conversation coaching, distilled into something that sits beside
                you in real time. Not theory — actual moves for actual conversations.
              </p>

              {/* Stat card */}
              <div className="mt-8 rounded-2xl bg-beige-900 p-6 md:p-8">
                <p className="font-serif text-4xl font-bold text-cream md:text-5xl">73%</p>
                <p className="mt-2 text-sm text-beige-200">
                  of conversations coached through {BRAND.name} lasted past the first
                  week — compared to 31% without coaching.
                </p>
                <p className="mt-3 font-mono text-xs text-beige-400">
                  Based on 12,000+ coached conversations, 2024–2025
                </p>
              </div>

              {/* Coach credibility pills */}
              <div className="mt-8">
                <p className="mb-4 text-sm font-medium text-mutedtext">Built with real coaches</p>
                <div className="flex flex-wrap gap-3">
                  {COACHES.map((coach) => (
                    <div key={coach.name} className="flex items-center gap-2 rounded-full border border-beige-300 bg-white px-3 py-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-beige-200 font-serif text-xs font-bold text-beige-900">
                        {coach.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-charcoal">{coach.name}</p>
                        <p className="font-mono text-[10px] text-mutedtext">{coach.credential}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={submitOnboarding}
                disabled={submitting}
                className="mt-10 inline-flex items-center gap-2 self-start rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Q1: Dating apps */}
          {step === 'q1' && (
            <QuestionScreen
              title="Which apps are you on?"
              why="So the coach knows where your conversations live"
              canProceed={canProceed()}
              onNext={next}
              onBack={back}
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {DATING_APPS.map((app) => (
                  <SelectTile
                    key={app}
                    label={app}
                    selected={selectedApps.includes(app)}
                    onClick={() => toggleApp(app)}
                  />
                ))}
              </div>
            </QuestionScreen>
          )}

          {/* Q2: Vibe tags */}
          {step === 'q2' && (
            <QuestionScreen
              title="What&apos;s your vibe?"
              why="So the coach speaks in your voice, not a generic one"
              canProceed={canProceed()}
              onNext={next}
              onBack={back}
            >
              <div className="flex flex-wrap gap-2.5">
                {ALL_VIBE_TAGS.map((vibe) => (
                  <SelectPill
                    key={vibe.id}
                    label={vibe.label}
                    selected={selectedVibes.includes(vibe.id)}
                    onClick={() => toggleVibe(vibe.id)}
                  />
                ))}
              </div>
            </QuestionScreen>
          )}

          {/* Q3: Communication style */}
          {step === 'q3' && (
            <QuestionScreen
              title="How do you usually text?"
              why="So the coach adjusts its tone to match yours"
              canProceed={canProceed()}
              onNext={next}
              onBack={back}
            >
              <div className="space-y-3">
                {COMM_STYLES.map((style) => (
                  <SelectCard
                    key={style.id}
                    label={style.label}
                    why={style.why}
                    selected={commStyle === style.id}
                    onClick={() => setCommStyle(style.id)}
                  />
                ))}
              </div>
            </QuestionScreen>
          )}

          {/* Q4: Current focus */}
          {step === 'q4' && (
            <QuestionScreen
              title="What&apos;s your biggest thing right now?"
              why="So the coach focuses on what actually matters to you"
              canProceed={canProceed()}
              onNext={next}
              onBack={back}
            >
              <div className="space-y-3">
                {FOCUS_AREAS.map((area) => (
                  <SelectCard
                    key={area.id}
                    label={area.label}
                    why={area.why}
                    selected={focus === area.id}
                    onClick={() => setFocus(area.id)}
                  />
                ))}
              </div>
            </QuestionScreen>
          )}

          {/* Q5: Routing choice */}
          {step === 'q5' && (
            <QuestionScreen
              title="Where do you want to start?"
              why="You can switch anytime — this just sets your starting point"
              canProceed={canProceed()}
              onNext={next}
              onBack={back}
            >
              <div className="space-y-3">
                <SelectCard
                  label="Jump into a real conversation"
                  why="You have a match waiting — let&apos;s coach you through it"
                  selected={routing === 'match'}
                  onClick={() => setRouting('match')}
                />
                <SelectCard
                  label="Practice first"
                  why="Warm up with coaching scenarios before the real thing"
                  selected={routing === 'practice'}
                  onClick={() => setRouting('practice')}
                />
              </div>
            </QuestionScreen>
          )}

          {/* Ready screen */}
          {step === 'ready' && (
            <div className="flex min-h-[80vh] flex-col justify-center">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-coral">
                You&apos;re set up
              </p>
              <h1 className="text-balance font-serif text-3xl font-bold leading-tight text-charcoal md:text-4xl">
                Your coach is ready.
              </h1>
              <p className="mt-4 text-lg text-mutedtext">
                Based on what you told us, here&apos;s how we&apos;ll approach things:
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {selectedApps.length > 0 && (
                  <PersonalizationChip label={`Apps: ${selectedApps.join(', ')}`} />
                )}
                {selectedVibes.length > 0 && (
                  <PersonalizationChip label={`Vibe: ${selectedVibes.slice(0, 3).map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(', ')}`} />
                )}
                {commStyle && (
                  <PersonalizationChip
                    label={`Coaching tone: ${COMM_STYLES.find((s) => s.id === commStyle)?.label}`}
                  />
                )}
                {focus && (
                  <PersonalizationChip
                    label={`Focus: ${FOCUS_AREAS.find((a) => a.id === focus)?.label}`}
                  />
                )}
              </div>
              <button
                onClick={next}
                className="mt-10 inline-flex items-center gap-2 self-start rounded-lg bg-coral px-8 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark"
              >
                {submitting ? 'Saving...' : "Let's go"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionScreen({
  title,
  why,
  children,
  canProceed,
  onNext,
  onBack,
}: {
  title: string;
  why: string;
  children: React.ReactNode;
  canProceed: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="pt-12">
      <h1 className="text-balance font-serif text-2xl font-bold leading-tight text-charcoal md:text-3xl">
        {title}
      </h1>
      <p className="mt-2 font-mono text-xs text-mutedtext">{why}</p>
      <div className="mt-8">{children}</div>
      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-mutedtext transition-colors hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="inline-flex items-center gap-2 rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SelectTile({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border px-4 py-4 text-center text-sm font-medium transition-all',
        selected
          ? 'border-coral bg-coral/10 text-charcoal'
          : 'border-beige-300 bg-white text-mutedtext hover:border-beige-400 hover:bg-beige-50'
      )}
    >
      {label}
      {selected && <Check className="mx-auto mt-1 h-3 w-3 text-coral" />}
    </button>
  );
}

function SelectPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-4 py-2.5 text-sm font-medium transition-all',
        selected
          ? 'border-coral bg-coral/10 text-charcoal'
          : 'border-beige-300 bg-white text-mutedtext hover:border-beige-400 hover:bg-beige-50'
      )}
    >
      {label}
    </button>
  );
}

function SelectCard({ label, why, selected, onClick }: { label: string; why: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-coral bg-coral/10'
          : 'border-beige-300 bg-white hover:border-beige-400 hover:bg-beige-50'
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn('text-sm font-medium', selected ? 'text-charcoal' : 'text-mutedtext')}>
          {label}
        </span>
        {selected && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-coral">
            <Check className="h-3 w-3 text-cream" />
          </div>
        )}
      </div>
      <p className="mt-1 font-mono text-xs text-mutedtext">{why}</p>
    </button>
  );
}

function PersonalizationChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-beige-300 bg-white px-3 py-2 text-xs font-medium text-charcoal">
      <Check className="h-3 w-3 text-sage" />
      {label}
    </span>
  );
}
