'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, GraduationCap, TrendingUp, User } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { CreditPill } from '@/components/credit-pill';
import { mockUser } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/chat', label: 'Chats', icon: MessageCircle },
  { href: '/coach', label: 'Coach', icon: GraduationCap },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
  { href: '/profile', label: 'Profile', icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop top nav */}
      <header className="sticky top-0 z-40 hidden border-b border-beige-200 bg-cream/90 backdrop-blur-sm md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
          <Link href="/home" className="font-serif text-xl font-bold text-charcoal">
            {BRAND.name}
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-beige-200 text-beige-900'
                      : 'text-mutedtext hover:text-charcoal hover:bg-beige-100'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <CreditPill credits={mockUser.credits} />
        </div>
      </header>

      {/* Main content */}
      <main className="pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-beige-200 bg-cream/95 backdrop-blur-sm md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors',
                  active ? 'text-coral' : 'text-mutedtext'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
