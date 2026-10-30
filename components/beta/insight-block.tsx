'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Turn = { role: 'user' | 'ai'; text: string };

const SUGGESTIONS: Record<'read' | 'next_move', string[]> = {
  read: ['Why do you read it that way?', 'What should that change in my reply?', 'How sure are you?'],
  next_move: ['What exactly should I do?', 'Give me some examples', "What if she doesn't answer?"],
};

/**
 * Wraps one insight (the "read" or the "next move") with a small "i" button.
 * Clicking it opens a mini chat UNDER that insight. It is separate from the
 * main chat: its messages are never added to the conversation history, and the
 * AI only sees the chat so far plus this one insight.
 */
export function InsightBlock({
  kind,
  insight,
  context,
  history,
  children,
  className,
}: {
  kind: 'read' | 'next_move';
  insight: string;
  context: { her_message: string; mode: string; stage: string };
  history: Array<{ sender: 'her' | 'him'; text: string }>;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [thread, open]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setError(null);
    setInput('');
    setBusy(true);
    const prior = thread;
    setThread([...prior, { role: 'user', text: question }, { role: 'ai', text: '' }]);
    try {
      const res = await fetch('/api/beta/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, insight, context, history, thread: prior, question }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Something went wrong. Please try again.');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setThread([...prior, { role: 'user', text: question }, { role: 'ai', text: answer }]);
      }
    } catch (err) {
      setThread(prior);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const label = kind === 'next_move' ? 'next move' : 'this';

  return (
    <div className={cn('relative', className)}>
      {children}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? `Close questions about ${label}` : `Ask about ${label}`}
        title="Ask about this"
        className={cn(
          'absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
          open
            ? 'border-coral bg-coral text-cream'
            : 'border-beige-300 bg-white text-mutedtext hover:border-coral hover:text-coral'
        )}
      >
        {open ? <X className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="lp-pop mt-2 rounded-xl border border-beige-200 bg-white p-3 shadow-sm">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mutedtext">Ask about this</p>

          {thread.length > 0 && (
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
              {thread.map((t, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed',
                    t.role === 'user'
                      ? 'ml-auto rounded-tr-sm bg-beige-100 text-charcoal'
                      : 'rounded-tl-sm bg-cream text-charcoal'
                  )}
                >
                  {t.text || (busy && i === thread.length - 1 ? <span className="text-mutedtext">Thinking…</span> : '')}
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}

          {thread.length === 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS[kind].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  disabled={busy}
                  className="rounded-full border border-beige-300 px-3 py-1 text-xs font-medium text-charcoal transition-colors hover:border-coral disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {error && <p className="mt-2 text-xs text-coral">{error}</p>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="mt-2 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={400}
              placeholder="Ask a question about this…"
              className="min-w-0 flex-1 rounded-full border border-beige-300 bg-cream px-3 py-2 text-sm text-charcoal outline-none focus:border-coral"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send question"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral text-cream transition-colors hover:bg-coral-dark disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}