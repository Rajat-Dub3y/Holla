'use client';

import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockedOverlayProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
  onClick?: () => void;
}

export function LockedOverlay({
  children,
  label = 'Premium feature',
  className,
  onClick,
}: LockedOverlayProps) {
  return (
    <div className={cn('group relative cursor-pointer', className)} onClick={onClick}>
      <div className="blur-cap">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-beige-900 text-cream">
          <Lock className="h-4 w-4" />
        </div>
        <span className="font-mono text-xs text-beige-900">{label}</span>
      </div>
    </div>
  );
}
