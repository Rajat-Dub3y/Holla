'use client';

import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditPillProps {
  credits: number;
  className?: string;
}

export function CreditPill({ credits, className }: CreditPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-beige-200 px-3 py-1.5 font-mono text-xs font-medium text-beige-900',
        className
      )}
    >
      <Zap className="h-3 w-3 text-coral" />
      <span>{Number.isFinite(credits) ? credits.toLocaleString() : '∞'}</span>
    </div>
  );
}
