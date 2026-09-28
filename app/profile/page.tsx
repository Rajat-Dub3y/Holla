'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, ArrowRight } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { CreditPill } from '@/components/credit-pill';
import { BRAND, PERSONAS } from '@/lib/brand';
import { auth } from '@/lib/firebase-client';
import { useMe } from '@/lib/use-me';

export default function ProfilePage() {
  const router = useRouter();
  const { profile } = useMe();
  const persona = PERSONAS[profile?.persona ?? 'entrepreneur'];

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch {
      toast.error('Could not sign out. Please try again.');
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-6 md:px-8 md:py-10">
        {/* Mobile top bar */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <span className="font-serif text-xl font-bold text-charcoal">{BRAND.name}</span>
          <CreditPill credits={profile?.credits ?? 0} />
        </div>

        {/* Profile header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-beige-300 font-serif text-2xl font-bold text-beige-900">
            {(profile?.firstName ?? 'there').charAt(0)}
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-charcoal">{profile?.firstName ?? 'there'}</h1>
            <p className="text-sm text-mutedtext">{persona.label} · {persona.tagline}</p>
          </div>
        </div>

        {/* Vibe tags */}
        <div className="mb-8">
          <h2 className="mb-3 font-serif text-lg font-bold text-charcoal">Your vibe</h2>
          <div className="flex flex-wrap gap-2">
            {(profile?.vibeTags ?? []).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-beige-300 bg-white px-3 py-1.5 text-sm font-medium text-charcoal capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Account details */}
        <div className="mb-8 space-y-4">
          <h2 className="font-serif text-lg font-bold text-charcoal">Account</h2>
          <div className="rounded-2xl border border-beige-200 bg-white p-5 md:p-6">
            <div className="space-y-4">
              <DetailRow label="Plan" value={profile?.tier ?? 'free'} />
              <DetailRow label="Apps" value={profile?.datingApps.join(', ') ?? ''} />
              <DetailRow label="Communication style" value={profile?.communicationStyle ?? ''} />
              <DetailRow label="Current focus" value={profile?.currentFocus ?? ''} />
            </div>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="mb-8 rounded-2xl bg-beige-900 p-5 md:p-6">
          <h3 className="font-serif text-lg font-bold text-cream">
            Unlock everything
          </h3>
          <p className="mt-2 text-sm text-beige-200">
            Unlimited coaching, full growth scorecard, weekly digest, and all learning scenarios.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-coral-light"
          >
            See plans
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Settings */}
        <div>
          <h2 className="mb-3 font-serif text-lg font-bold text-charcoal">Settings</h2>
          <div className="space-y-2">
            <SettingsRow label="Notifications" value="On" />
            <SettingsRow label="Data & privacy" value="Your data is never sold" />
            <SettingsRow label="Sign out" value="" onClick={handleSignOut} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-beige-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-mutedtext">{label}</span>
      <span className="text-sm font-medium text-charcoal">{value}</span>
    </div>
  );
}

function SettingsRow({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl border border-beige-200 bg-white px-4 py-3 text-left transition-colors hover:bg-beige-50">
      <span className="flex items-center gap-2 text-sm font-medium text-charcoal">
        <Settings className="h-4 w-4 text-mutedtext" />
        {label}
      </span>
      {value && <span className="text-sm text-mutedtext">{value}</span>}
    </button>
  );
}
