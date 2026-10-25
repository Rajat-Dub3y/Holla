'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, Copy, Paperclip, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';
// @ts-expect-error Next.js handles the app-level stylesheet side-effect import.
import '../landing.css'; // typing-dots + pop-in animations

// ─────────────────────────────────────────────────────────
// Copy (from the Beta Phase 1 brief, Part 2)
// ─────────────────────────────────────────────────────────
const HOOK = 'Getting matches but no dates?';
const HEADLINE = 'Looking for an exciting opener, or not sure what to reply? Try Holla AI.';
// Brief wording is "...thousands of hours of material". Kept honest until the
// real knowledge-base size is confirmed. Swap in the brief's line when it's true.
const SUBLINE =
  "We've collected the knowledge of top dating coaches, so you don't have to.";
const PLACEHOLDER = 'Paste her reply, type it, or upload a screenshot.';
const OPENER_LINE =
  'Looking for an opener? Upload a screenshot of her profile — and yours if you like — and Holla will write one with personality.';

type Tab = 'reply' | 'opener';
type Style = 'playful' | 'curious' | 'assertive' | 'warm';

type Reply = { style: Style; recommended: boolean; text: string };
type Result = {
  requestId: string | null;
  mode: 'opener' | 'reply' | 'follow_up' | 'fix_my_text';
  stage: string;
  her_message: string;
  read: string;
  replies: Reply[];
  next_move: string;
  mode_note?: string;
  clarify?: { question: string; options: string[] };
  retrieved_sources?: Array<{ id: string; coach: string; similarity: number }>;
  latencyMs?: number;
};

type Attachment = { mimeType: string; data: string; preview: string };
type HistoryTurn = { sender: 'her' | 'him'; text: string };
type Msg =
  | { id: number; kind: 'user'; text: string; previews: string[] }
  | { id: number; kind: 'holla'; result: Result }
  | { id: number; kind: 'error'; text: string };

const STYLE_LABEL: Record<Style, string> = {
  playful: 'Playful',
  curious: 'Curious',
  assertive: 'Assertive',
  warm: 'Warm',
};

const MAX_IMAGES = 3;

// Shrinks screenshots before upload (fast, and stays under the request size limit).
async function toCompressedJpeg(file: File): Promise<Attachment> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  return { mimeType: 'image/jpeg', data: dataUrl.split(',')[1], preview: dataUrl };
}

export default function BetaPage() {
  const [tab, setTab] = useState<Tab>('reply');
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [votes, setVotes] = useState<Record<string, 'up' | 'down'>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const sessionId = useRef('anon');
  const debugKey = useRef<string | null>(null);
  const lastInput = useRef<{ text: string; images: Attachment[] } | null>(null);
  const idCounter = useRef(0);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      let id = localStorage.getItem('holla-beta-session');
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('holla-beta-session', id);
      }
      sessionId.current = id;
    } catch {
      /* storage unavailable: fine */
    }
    debugKey.current = new URLSearchParams(window.location.search).get('debug');
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  // Grow the text box with its content
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const nextId = () => ++idCounter.current;

  const addFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    const room = MAX_IMAGES - attachments.length;
    try {
      const converted = await Promise.all(images.slice(0, room).map(toCompressedJpeg));
      setAttachments((prev) => [...prev, ...converted]);
    } catch {
      setMessages((m) => [...m, { id: nextId(), kind: 'error', text: "Couldn't read that image. Try another screenshot." }]);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);
    if (files.some((f) => f.type.startsWith('image/'))) {
      e.preventDefault();
      void addFiles(files);
    }
  };

  const run = async (input: { text: string; images: Attachment[] }, hint?: string, currentHistory = history) => {
    setLoading(true);
    lastInput.current = input;
    try {
      const res = await fetch('/api/beta/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(debugKey.current ? { 'x-beta-debug': debugKey.current } : {}),
        },
        body: JSON.stringify({
          sessionId: sessionId.current,
          mode: tab,
          text: input.text,
          images: input.images.map(({ mimeType, data }) => ({ mimeType, data })),
          history: currentHistory,
          hint,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
      const result = data as Result;

      setMessages((m) => [...m, { id: nextId(), kind: 'holla', result }]);

      // Keep the conversation in context for her next message.
      if (!result.clarify && result.her_message && result.mode !== 'opener' && result.mode !== 'fix_my_text') {
        setHistory((h) => [...h, { sender: 'her', text: result.her_message }]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: nextId(), kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const send = () => {
    if (loading) return;
    const input = { text: text.trim(), images: attachments };
    if (!input.text && input.images.length === 0) return;
    setMessages((m) => [
      ...m,
      { id: nextId(), kind: 'user', text: input.text, previews: input.images.map((i) => i.preview) },
    ]);
    setText('');
    setAttachments([]);
    void run(input);
  };

  const answerClarification = (option: string) => {
    if (loading || !lastInput.current) return;
    setMessages((m) => [...m, { id: nextId(), kind: 'user', text: option, previews: [] }]);
    void run(lastInput.current, option);
  };

  const copyReply = async (key: string, reply: string) => {
    try {
      await navigator.clipboard.writeText(reply);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = reply;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    // Assume what he copies is what he sends: keeps the thread in context.
    setHistory((h) => [...h, { sender: 'him', text: reply }]);
  };

  const vote = async (result: Result, index: number, v: 'up' | 'down') => {
    if (!result.requestId) return;
    const key = `${result.requestId}-${index}`;
    setVotes((prev) => ({ ...prev, [key]: v }));
    try {
      await fetch('/api/beta/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: result.requestId, replyIndex: index, vote: v }),
      });
    } catch {
      /* feedback is best-effort */
    }
  };

  const newChat = () => {
    setMessages([]);
    setHistory([]);
    setText('');
    setAttachments([]);
    lastInput.current = null;
  };

  const empty = messages.length === 0;

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-6 pt-8 md:px-6">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <span className="font-serif text-3xl font-bold text-charcoal">{BRAND.name}</span>
        </div>

        {/* Hero copy */}
        <div className={cn('text-center', empty ? 'mt-10' : 'mt-4')}>
          {empty ? (
            <>
              <p className="font-mono text-xs uppercase tracking-widest text-coral">{HOOK}</p>
              <h1 className="mt-3 text-balance font-serif text-3xl font-bold leading-tight text-charcoal md:text-4xl">
                {HEADLINE}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-mutedtext">{SUBLINE}</p>
            </>
          ) : (
            <button
              onClick={newChat}
              className="font-mono text-xs uppercase tracking-widest text-mutedtext hover:text-coral"
            >
              New chat
            </button>
          )}
        </div>

        {/* Mode switch */}
        <div
          role="tablist"
          aria-label="Mode"
          className="mx-auto mt-8 flex w-fit rounded-full border border-beige-300 bg-beige-50 p-1"
        >
          {([
            ['reply', 'Reply to her'],
            ['opener', 'Write an opener'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
                tab === id ? 'bg-coral text-cream' : 'text-mutedtext hover:text-charcoal'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Thread */}
        <div className="mt-6 flex-1 space-y-5" aria-live="polite">
          {messages.map((m) => {
            if (m.kind === 'user') {
              return (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tr-sm bg-beige-400 px-4 py-3 text-sm text-charcoal shadow-sm">
                    {m.previews.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {m.previews.map((p, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={p} alt="Uploaded screenshot" className="h-24 rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                    {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                  </div>
                </div>
              );
            }
            if (m.kind === 'error') {
              return (
                <p key={m.id} className="rounded-xl border border-coral/40 bg-coral/5 px-4 py-3 text-sm text-charcoal">
                  {m.text}
                </p>
              );
            }
            return (
              <ResultCard
                key={m.id}
                result={m.result}
                copied={copied}
                votes={votes}
                onCopy={copyReply}
                onVote={vote}
                onClarify={answerClarification}
                disabled={loading}
              />
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm" aria-label="Reading">
                <span className="lp-dot h-1.5 w-1.5 rounded-full bg-mutedtext" />
                <span className="lp-dot h-1.5 w-1.5 rounded-full bg-mutedtext" />
                <span className="lp-dot h-1.5 w-1.5 rounded-full bg-mutedtext" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input box */}
        <div className="sticky bottom-0 mt-6 bg-cream pb-2 pt-2">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.preview} alt="Screenshot to upload" className="h-16 rounded-lg border border-beige-300 object-cover" />
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Remove screenshot"
                    className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal text-cream"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-beige-300 bg-white p-2 shadow-sm focus-within:border-coral">
            <textarea
              ref={boxRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={onPaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={PLACEHOLDER}
              aria-label="Her message, a screenshot, or your draft"
              className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-charcoal outline-none placeholder:text-mutedtext"
            />
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void addFiles(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              aria-label="Upload a screenshot"
              disabled={attachments.length >= MAX_IMAGES}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-mutedtext transition-colors hover:bg-beige-100 hover:text-charcoal disabled:opacity-40"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              onClick={send}
              disabled={loading || (!text.trim() && attachments.length === 0)}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral text-cream transition-colors hover:bg-coral-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-3 text-center text-xs leading-relaxed text-mutedtext">{OPENER_LINE}</p>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  copied,
  votes,
  onCopy,
  onVote,
  onClarify,
  disabled,
}: {
  result: Result;
  copied: string | null;
  votes: Record<string, 'up' | 'down'>;
  onCopy: (key: string, text: string) => void;
  onVote: (result: Result, index: number, v: 'up' | 'down') => void;
  onClarify: (option: string) => void;
  disabled: boolean;
}) {
  // One quick tap instead of guessing who is who.
  if (result.clarify) {
    return (
      <div className="lp-pop rounded-xl border-l-2 border-coral bg-beige-50 p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-coral">Quick check</p>
        {result.her_message && (
          <p className="mt-2 text-xs text-mutedtext">I read: &ldquo;{result.her_message}&rdquo;</p>
        )}
        <p className="mt-2 text-sm font-medium text-charcoal">{result.clarify.question}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {result.clarify.options.map((o) => (
            <button
              key={o}
              onClick={() => onClarify(o)}
              disabled={disabled}
              className="rounded-full border border-beige-300 bg-white px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:border-coral disabled:opacity-50"
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const [recommended, ...alternatives] = result.replies;
  const isOpener = result.mode === 'opener';

  return (
    <div className="lp-pop space-y-3">
      {result.mode_note && <p className="font-mono text-xs text-coral">{result.mode_note}</p>}

      {/* 1. Her message, as Holla read it */}
      {result.her_message && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-mutedtext">
            {isOpener ? 'Her profile, as I read it' : 'Her message, as I read it'}
          </p>
          <div className="mt-1 max-w-[90%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-charcoal shadow-sm">
            {result.her_message}
          </div>
        </div>
      )}

      {/* 2. What she's saying */}
      {result.read && (
        <div className="rounded-lg border-l-2 border-coral bg-beige-50 px-3 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-coral">
            {result.mode === 'fix_my_text' ? 'What I changed' : "What she's saying"}
          </span>
          <p className="mt-1 text-sm leading-relaxed text-charcoal">{result.read}</p>
        </div>
      )}

      {/* 3. Recommended */}
      {recommended && (
        <ReplyBlock
          label="Recommended"
          reply={recommended}
          index={0}
          highlight
          result={result}
          copied={copied}
          votes={votes}
          onCopy={onCopy}
          onVote={onVote}
        />
      )}

      {/* 4. Or try */}
      {alternatives.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mutedtext">Or try</p>
          {alternatives.map((r, i) => (
            <ReplyBlock
              key={i}
              reply={r}
              index={i + 1}
              result={result}
              copied={copied}
              votes={votes}
              onCopy={onCopy}
              onVote={onVote}
            />
          ))}
        </div>
      )}

      {/* 5. Next move */}
      {result.next_move && (
        <p className="text-sm text-mutedtext">
          <span className="font-mono text-[10px] uppercase tracking-wider text-coral">Next move </span>
          {result.next_move}
        </p>
      )}

      {/* Team-only debug (needs ?debug=KEY on the URL and a matching BETA_DEBUG_KEY) */}
      {result.retrieved_sources && (
        <details className="rounded-lg border border-dashed border-beige-300 p-3 text-xs text-mutedtext">
          <summary className="cursor-pointer font-mono">
            debug · {result.retrieved_sources.length} chunks · {result.latencyMs}ms · stage {result.stage}
          </summary>
          <ul className="mt-2 space-y-1 font-mono">
            {result.retrieved_sources.map((s) => (
              <li key={s.id}>
                {s.similarity.toFixed(3)} · {s.coach} · {s.id.slice(0, 8)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ReplyBlock({
  label,
  reply,
  index,
  highlight,
  result,
  copied,
  votes,
  onCopy,
  onVote,
}: {
  label?: string;
  reply: Reply;
  index: number;
  highlight?: boolean;
  result: Result;
  copied: string | null;
  votes: Record<string, 'up' | 'down'>;
  onCopy: (key: string, text: string) => void;
  onVote: (result: Result, index: number, v: 'up' | 'down') => void;
}) {
  const key = `${result.requestId ?? 'x'}-${index}`;
  const myVote = votes[key];
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        highlight ? 'border-coral bg-white shadow-sm' : 'border-beige-200 bg-white'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-coral">
          {label ? `${label} · ` : ''}
          {STYLE_LABEL[reply.style] ?? reply.style}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onVote(result, index, 'up')}
            aria-label="Good reply"
            aria-pressed={myVote === 'up'}
            className={cn(
              'rounded-md p-1.5 transition-colors hover:bg-beige-100',
              myVote === 'up' ? 'text-sage' : 'text-mutedtext'
            )}
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => onVote(result, index, 'down')}
            aria-label="Bad reply"
            aria-pressed={myVote === 'down'}
            className={cn(
              'rounded-md p-1.5 transition-colors hover:bg-beige-100',
              myVote === 'down' ? 'text-coral' : 'text-mutedtext'
            )}
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-charcoal">{reply.text}</p>
      <button
        onClick={() => onCopy(key, reply.text)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-beige-300 px-3 py-1.5 text-xs font-semibold text-charcoal transition-colors hover:bg-beige-50"
      >
        {copied === key ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5" />}
        {copied === key ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
