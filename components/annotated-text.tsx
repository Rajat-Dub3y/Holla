'use client';

import { cn } from '@/lib/utils';

interface AnnotatedCircleProps {
  children: React.ReactNode;
  className?: string;
}

export function AnnotatedCircle({ children, className }: AnnotatedCircleProps) {
  return (
    <span className="relative inline-block">
      <span className="absolute -inset-1 rounded-full border-2 border-coral/60" />
      <span className={cn('relative', className)}>{children}</span>
    </span>
  );
}

interface AnnotatedUnderlineProps {
  children: React.ReactNode;
  className?: string;
}

export function AnnotatedUnderline({ children, className }: AnnotatedUnderlineProps) {
  return (
    <span className="relative inline-block">
      <span className="absolute -bottom-0.5 left-0 right-0 h-2 bg-coral/25" />
      <span className={cn('relative', className)}>{children}</span>
    </span>
  );
}

interface StickyNoteProps {
  children: React.ReactNode;
  className?: string;
  arrow?: 'left' | 'right' | 'none';
}

export function StickyNote({ children, className, arrow = 'left' }: StickyNoteProps) {
  return (
    <div className="relative inline-flex items-start">
      {arrow === 'left' && (
        <svg
          className="mr-1 mt-1 h-4 w-4 shrink-0 text-coral"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M2 10 L8 10 M5 7 L8 10 L5 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <div
        className={cn(
          'rounded-md bg-beige-100 px-2.5 py-1.5 text-xs leading-snug text-beige-900 shadow-sm',
          className
        )}
      >
        {children}
      </div>
      {arrow === 'right' && (
        <svg
          className="ml-1 mt-1 h-4 w-4 shrink-0 text-coral"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M18 10 L12 10 M15 7 L12 10 L15 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
