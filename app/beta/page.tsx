'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Check, Copy, Paperclip, PencilLine, Plus, Send, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase-client';
import { InsightBlock } from '@/components/beta/insight-block';
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
const OPENER_PLACEHOLDER = 'Upload a screenshot of her profile, or paste her bio or a prompt she answered.';
const OPENER_TAB_LINE =
  'A screenshot of her profile works best. Add yours too if you like, and Holla will write an opener with personality.';
const ABOUT_PLACEHOLDER = 'e.g. I climb, cook badly, live in Austin, work in design';
const OPENER_LINE =
  'Looking for an opener? Upload a screenshot of her profile — and yours if you like — and Holla will write one with personality.';

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

type Tab = 'reply' | 'opener';
type Role = 'her' | 'me';
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
  context_request?: string;
  style_label?: string;
  retrieved_sources?: Array<{ id: string; coach: string; similarity: number }>;
  latencyMs?: number;
};

type Attachment = { mimeType: string; data: string; preview: string };
type HistoryTurn = { sender: 'her' | 'him'; text: string };

/**
 * The thread is the source of truth. Her messages and yours are real chat
 * bubbles; Holla's suggestions sit under them. The history sent to the AI is
 * built from these items, so what you see is what the AI knows.
 */
type Item =
  | { id: number; kind: 'her'; text: string; previews: string[]; readText?: string }
  | { id: number; kind: 'profile'; text: string; previews: string[] }
  | { id: number; kind: 'him'; text: string; fromKey?: string }
  | { id: number; kind: 'draft'; text: string }
  | { id: number; kind: 'holla'; result: Result; history: HistoryTurn[] }
  | { id: number; kind: 'error'; text: string };

const STYLE_LABEL: Record<Style, string> = {
  playful: 'Playful',
  curious: 'Curious',
  assertive: 'Assertive',
  warm: 'Warm',
};

const DRAFT_PLACEHOLDER = "Type the message you're planning to send…";

function itemsToHistory(items: Item[]): HistoryTurn[] {
  const out: HistoryTurn[] = [];
  for (const it of items) {
    if (it.kind === 'her') {
      const t = (it.text || it.readText || '').trim();
      if (t) out.push({ sender: 'her', text: t });
    } else if (it.kind === 'him' && it.text.trim()) {
      out.push({ sender: 'him', text: it.text.trim() });
    }
  }
  return out;
}

export default function BetaPage() {
  const [tab, setTab] = useState<Tab>('reply');
  const [role, setRole] = useState<Role>('her');
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  // Shown while the reply is still being written (streamed from the server).
  const [partial, setPartial] = useState<{ her_message?: string; mode?: string; read?: string; screenshot?: boolean } | null>(null);
  const [votes, setVotes] = useState<Record<string, 'up' | 'down'>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [firstMover, setFirstMover] = useState<'auto' | 'she' | 'me'>('auto');
  const [aboutMe, setAboutMe] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  const sessionId = useRef('anon');
  const debugKey = useRef<string | null>(null);
  const lastRun = useRef<{ text: string; images: Attachment[]; from: 'her' | 'draft'; history: HistoryTurn[]; tab: Tab; itemId: number } | null>(null);
  const idCounter = useRef(0);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLTextAreaElement | null>(null);

  const history = useMemo(() => itemsToHistory(items), [items]);
  const asRole: Role = tab === 'reply' ? role : 'her';

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
    try {
      const saved = localStorage.getItem('holla-beta-about');
      if (saved) setAboutMe(saved);
    } catch {
      /* ignore */
    }
    debugKey.current = new URLSearchParams(window.location.search).get('debug');
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [items, loading, partial]);

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
      setItems((m) => [...m, { id: nextId(), kind: 'error', text: "Couldn't read that image. Try another screenshot." }]);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (asRole === 'me') return; // drafts are text only
    const files = Array.from(e.clipboardData.files);
    if (files.some((f) => f.type.startsWith('image/'))) {
      e.preventDefault();
      void addFiles(files);
    }
  };

  /** Asks the server. `history` is the thread BEFORE this message. */
  const run = async (
    input: { text: string; images: Attachment[]; from: 'her' | 'draft'; history: HistoryTurn[]; tab: Tab; itemId: number },
    hint?: string
  ) => {
    setLoading(true);
    lastRun.current = input;
    try {
      // Signed-in users (who did onboarding) get their style applied server-side.
      let token: string | undefined;
      try {
        token = await auth.currentUser?.getIdToken();
      } catch {
        /* not signed in: anonymous beta */
      }
      const res = await fetch('/api/beta/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(debugKey.current ? { 'x-beta-debug': debugKey.current } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: sessionId.current,
          mode: input.tab,
          from: input.from,
          text: input.text,
          images: input.images.map(({ mimeType, data }) => ({ mimeType, data })),
          history: input.history,
          hint,
          firstMover: input.tab === 'reply' ? firstMover : 'auto',
          aboutMe: aboutMe.trim() || undefined,
        }),
      });
      let result: Result;
      const isStream = (res.headers.get('content-type') ?? '').includes('ndjson');
      if (!isStream) {
        // Validation / rate-limit errors come back as plain JSON.
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
        result = data as Result;
      } else {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let final: Result | null = null;
        const handle = (line: string) => {
          if (!line.trim()) return;
          const ev = JSON.parse(line);
          if (ev.type === 'understood') setPartial((p) => ({ ...p, her_message: ev.her_message, mode: ev.mode }));
          else if (ev.type === 'read') setPartial((p) => ({ ...p, read: ev.text }));
          else if (ev.type === 'error') throw new Error(ev.error);
          else if (ev.type === 'final') final = ev as Result;
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          lines.forEach(handle);
        }
        handle(buf);
        if (!final) throw new Error('Something went wrong. Please try again.');
        result = final;
      }

      setItems((m) => {
        let next = m;
        // The thread bubble for her message: keep what the AI read from a screenshot,
        // and turn a profile upload (or an AI mode switch to opener) into a profile card.
        if (!result.clarify) {
          next = next.map((it): Item => {
            if (it.id !== input.itemId) return it;
            if (it.kind === 'her' && result.mode === 'opener') return { id: it.id, kind: 'profile', text: it.text, previews: it.previews };
            if (it.kind === 'her' && it.previews.length > 0 && !it.text) return { ...it, readText: result.her_message };
            return it;
          });
        }
        return [...next, { id: nextId(), kind: 'holla', result, history: input.history }];
      });
    } catch (err) {
      setItems((m) => [
        ...m,
        { id: nextId(), kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      setPartial(null);
    }
  };

  /** Her message (typed, pasted or screenshot) or, on the opener tab, her profile. */
  const sendHers = () => {
    if (loading) return;
    const t = text.trim();
    if (!t && attachments.length === 0) return;
    const id = nextId();
    const previews = attachments.map((a) => a.preview);
    const snapshot = history; // thread before this message
    setItems((m) => [...m, tab === 'opener' ? { id, kind: 'profile', text: t, previews } : { id, kind: 'her', text: t, previews }]);
    const images = attachments;
    setText('');
    setAttachments([]);
    setPartial(images.length > 0 ? { screenshot: true } : null);
    void run({ text: t, images, from: 'her', history: snapshot, tab, itemId: id });
  };

  /** Feedback on a message he is planning to send (nothing is added to the chat yet). */
  const checkDraft = () => {
    if (loading) return;
    const t = text.trim();
    if (!t) return;
    const id = nextId();
    const snapshot = history;
    // One live draft at a time: a new check replaces the previous draft and its feedback.
    setItems((m) => {
      const lastDraft = [...m].reverse().find((x) => x.kind === 'draft');
      const base = lastDraft ? m.slice(0, m.findIndex((x) => x.id === lastDraft.id)) : m;
      return [...base, { id, kind: 'draft', text: t }];
    });
    void run({ text: t, images: [], from: 'draft', history: snapshot, tab: 'reply', itemId: id });
  };

  /** He sent it (his own words, or one of Holla's replies): it becomes a bubble on his side. */
  const markSent = (sentText?: string, fromKey?: string) => {
    const t = (sentText ?? text).trim();
    if (!t) return;
    setItems((m) => [
      ...m.filter((x) => x.kind !== 'draft'), // sending clears the draft preview
      { id: nextId(), kind: 'him', text: t, fromKey },
    ]);
    if (sentText === undefined) setText('');
    setRole('her'); // next message is probably hers
  };

  const removeSent = (id: number) => setItems((m) => m.filter((x) => x.id !== id));

  const answerClarification = (option: string) => {
    if (loading || !lastRun.current) return;
    setItems((m) => m.filter((x) => !(x.kind === 'holla' && x.result.clarify)));
    void run(lastRun.current, option);
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
    // Assume what he copies is what he sends. It shows as his bubble, and he can remove it.
    setItems((m) => (m.some((x) => x.kind === 'him' && x.fromKey === key) ? m : [...m.filter((x) => x.kind !== 'draft'), { id: nextId(), kind: 'him', text: reply, fromKey: key }]));
    setRole('her');
  };

  /** Puts a suggested reply in the box so he can edit it and check it before sending. */
  const useReply = (reply: string) => {
    setTab('reply');
    setRole('me');
    setText(reply);
    setTimeout(() => boxRef.current?.focus(), 0);
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
    setItems([]);
    setText('');
    setAttachments([]);
    setRole('her');
    lastRun.current = null;
  };

  const empty = items.length === 0;
  const primary = () => (asRole === 'me' ? checkDraft() : sendHers());

  // The newest suggestion card is the only one that needs its action buttons live.
  const lastHollaId = [...items].reverse().find((x) => x.kind === 'holla')?.id;

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

        {/* Mode-specific context */}
        {tab === 'reply' ? (
          empty && (
            <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-mutedtext">
              <span>Who messaged first?</span>
              {([
                ['auto', 'Not sure'],
                ['she', 'She did'],
                ['me', 'I did'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFirstMover(id)}
                  aria-pressed={firstMover === id}
                  className={cn(
                    'rounded-full border px-3 py-1 font-medium transition-colors',
                    firstMover === id
                      ? 'border-coral bg-coral/10 text-charcoal'
                      : 'border-beige-300 hover:border-beige-400'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )
        ) : (
          <p className="mx-auto mt-4 max-w-md text-center text-xs text-mutedtext">
            No messages yet? I&apos;ll write the first one from her profile.
          </p>
        )}

        {/* The conversation */}
        <div className="mt-6 flex-1 space-y-4" aria-live="polite">
          {items.map((it) => {
            if (it.kind === 'her') {
              return (
                <div key={it.id} className="flex justify-start">
                  <div className="max-w-[80%]">
                    <p className="mb-1 pl-1 font-mono text-[10px] uppercase tracking-wider text-mutedtext">Her</p>
                    <div className="space-y-2 rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-charcoal shadow-sm">
                      {it.previews.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {it.previews.map((p, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={p} alt="Uploaded screenshot" className="h-24 rounded-lg object-cover" />
                          ))}
                        </div>
                      )}
                      {it.text && <p className="whitespace-pre-wrap">{it.text}</p>}
                    </div>
                    {it.previews.length > 0 && it.readText && (
                      <p className="mt-1 pl-1 text-xs text-mutedtext">I read her last message as: &ldquo;{it.readText}&rdquo;</p>
                    )}
                  </div>
                </div>
              );
            }
            if (it.kind === 'profile') {
              return (
                <div key={it.id} className="rounded-xl border border-beige-300 bg-beige-50 px-4 py-3 text-sm text-charcoal">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-mutedtext">Her profile</p>
                  {it.previews.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {it.previews.map((p, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={p} alt="Uploaded profile screenshot" className="h-24 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                  {it.text && <p className="whitespace-pre-wrap">{it.text}</p>}
                </div>
              );
            }
            if (it.kind === 'him') {
              return (
                <div key={it.id} className="group flex justify-end">
                  <div className="max-w-[80%]">
                    <p className="mb-1 pr-1 text-right font-mono text-[10px] uppercase tracking-wider text-mutedtext">You</p>
                    <div className="rounded-2xl rounded-tr-sm bg-beige-400 px-4 py-3 text-sm text-charcoal shadow-sm">
                      <p className="whitespace-pre-wrap">{it.text}</p>
                    </div>
                    <button
                      onClick={() => removeSent(it.id)}
                      className="mt-1 block w-full pr-1 text-right text-[11px] text-mutedtext hover:text-coral"
                    >
                      Didn&apos;t send this
                    </button>
                  </div>
                </div>
              );
            }
            if (it.kind === 'draft') {
              return (
                <div key={it.id} className="flex justify-end">
                  <div className="max-w-[80%]">
                    <p className="mb-1 pr-1 text-right font-mono text-[10px] uppercase tracking-wider text-coral">Your draft · not sent</p>
                    <div className="rounded-2xl rounded-tr-sm border border-dashed border-coral/60 bg-white px-4 py-3 text-sm text-charcoal">
                      <p className="whitespace-pre-wrap">{it.text}</p>
                    </div>
                  </div>
                </div>
              );
            }
            if (it.kind === 'error') {
              return (
                <p key={it.id} className="rounded-xl border border-coral/40 bg-coral/5 px-4 py-3 text-sm text-charcoal">
                  {it.text}
                </p>
              );
            }
            return (
              <ResultCard
                key={it.id}
                result={it.result}
                history={it.history}
                live={it.id === lastHollaId}
                copied={copied}
                votes={votes}
                onCopy={copyReply}
                onUse={useReply}
                onVote={vote}
                onClarify={answerClarification}
                onUpload={() => fileInput.current?.click()}
                onFocusBox={() => boxRef.current?.focus()}
                disabled={loading}
              />
            );
          })}

          {loading && (
            <div className="space-y-2">
              {partial?.screenshot && !partial.her_message && (
                <p className="text-xs text-mutedtext">Reading your screenshot…</p>
              )}
              {partial?.read && (
                <div className="rounded-lg border-l-2 border-coral bg-beige-50 px-3 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-coral">
                    {partial.mode === 'fix_my_text' ? 'On your draft' : partial.mode === 'opener' ? 'What to lead with' : "What she's saying"}
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-charcoal">{partial.read}</p>
                </div>
              )}
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm" aria-label="Thinking">
                  <span className="lp-dot h-1.5 w-1.5 rounded-full bg-mutedtext" />
                  <span className="lp-dot h-1.5 w-1.5 rounded-full bg-mutedtext" />
                  <span className="lp-dot h-1.5 w-1.5 rounded-full bg-mutedtext" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="sticky bottom-0 mt-6 bg-cream pb-2 pt-2">
          {/* Whose message is this? */}
          {tab === 'reply' && (
            <div className="mb-2 flex items-center justify-between gap-2">
              <div role="tablist" aria-label="Whose message" className="flex w-fit rounded-full border border-beige-300 bg-beige-50 p-0.5 text-xs">
                {([
                  ['her', 'Her message'],
                  ['me', 'My message'],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={role === id}
                    onClick={() => setRole(id)}
                    className={cn(
                      'rounded-full px-3.5 py-1.5 font-semibold transition-colors',
                      role === id ? 'bg-charcoal text-cream' : 'text-mutedtext hover:text-charcoal'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="hidden text-right text-[11px] text-mutedtext sm:block">
                {role === 'her' ? 'Paste what she sent' : 'Check it before you send it'}
              </p>
            </div>
          )}

          {showAbout ? (
            <div className="mb-2 rounded-xl border border-beige-300 bg-white p-2">
              <label className="px-1 font-mono text-[10px] uppercase tracking-wider text-mutedtext">
                About you (optional, used to make replies sound like you)
              </label>
              <textarea
                value={aboutMe}
                onChange={(e) => {
                  setAboutMe(e.target.value);
                  try {
                    localStorage.setItem('holla-beta-about', e.target.value);
                  } catch {
                    /* ignore */
                  }
                }}
                rows={2}
                maxLength={400}
                placeholder={ABOUT_PLACEHOLDER}
                className="mt-1 w-full resize-none bg-transparent px-1 text-sm text-charcoal outline-none placeholder:text-mutedtext"
              />
            </div>
          ) : (
            empty && (
              <button
                onClick={() => setShowAbout(true)}
                className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-mutedtext hover:text-coral"
              >
                <Plus className="h-3.5 w-3.5" />
                {aboutMe.trim() ? 'Edit what I know about you' : 'Add something about you (optional)'}
              </button>
            )
          )}

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

          <div
            className={cn(
              'flex items-end gap-2 rounded-2xl border bg-white p-2 shadow-sm focus-within:border-coral',
              asRole === 'me' ? 'border-dashed border-coral/60' : 'border-beige-300'
            )}
          >
            <textarea
              ref={boxRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={onPaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  primary();
                }
              }}
              rows={1}
              placeholder={asRole === 'me' ? DRAFT_PLACEHOLDER : tab === 'opener' ? OPENER_PLACEHOLDER : PLACEHOLDER}
              aria-label={asRole === 'me' ? 'The message you plan to send' : 'Her message, a screenshot, or her profile'}
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
                if (role === 'me') setRole('her');
              }}
            />
            {asRole === 'her' && (
              <>
                <button
                  onClick={() => fileInput.current?.click()}
                  aria-label="Upload a screenshot"
                  disabled={attachments.length >= MAX_IMAGES}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-mutedtext transition-colors hover:bg-beige-100 hover:text-charcoal disabled:opacity-40"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  onClick={sendHers}
                  disabled={loading || (!text.trim() && attachments.length === 0)}
                  aria-label="Send"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral text-cream transition-colors hover:bg-coral-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {asRole === 'me' && (
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => markSent()}
                disabled={!text.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-beige-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal transition-colors hover:bg-beige-50 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
                I sent this
              </button>
              <button
                onClick={checkDraft}
                disabled={loading || !text.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                Check it first
              </button>
            </div>
          )}

          {empty && (
            <p className="mt-3 text-center text-xs leading-relaxed text-mutedtext">{tab === 'opener' ? OPENER_TAB_LINE : OPENER_LINE}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  history,
  live,
  copied,
  votes,
  onCopy,
  onUse,
  onVote,
  onClarify,
  onUpload,
  onFocusBox,
  disabled,
}: {
  result: Result;
  history: HistoryTurn[];
  live: boolean;
  copied: string | null;
  votes: Record<string, 'up' | 'down'>;
  onCopy: (key: string, text: string) => void;
  onUse: (text: string) => void;
  onVote: (result: Result, index: number, v: 'up' | 'down') => void;
  onClarify: (option: string) => void;
  onUpload: () => void;
  onFocusBox: () => void;
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
  const isDraftFeedback = result.mode === 'fix_my_text';
  const insightContext = { her_message: result.her_message, mode: result.mode, stage: result.stage };

  return (
    <div className="lp-pop ml-0 space-y-2.5 rounded-2xl border border-beige-200 bg-beige-50/70 p-3 md:ml-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-coral">
          {isDraftFeedback ? 'Holla · on your draft' : 'Holla'}
        </span>
        {result.style_label && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-mutedtext">In your style · {result.style_label}</span>
        )}
      </div>
      {result.mode_note && <p className="font-mono text-xs text-coral">{result.mode_note}</p>}

      {/* Opener with nothing to work from: ask for context */}
      {result.context_request && (
        <div className="rounded-xl border-l-2 border-coral bg-white p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-coral">Want it sharper?</p>
          <p className="mt-1 text-sm text-charcoal">{result.context_request}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={onUpload}
              className="rounded-full border border-beige-300 bg-white px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:border-coral"
            >
              Upload her profile
            </button>
            <button
              onClick={onFocusBox}
              className="rounded-full border border-beige-300 bg-white px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:border-coral"
            >
              Tell me about her
            </button>
          </div>
        </div>
      )}

      {/* The suggestion */}
      {recommended && (
        <ReplyBlock
          label={isDraftFeedback ? 'Better version' : 'Suggested reply'}
          reply={recommended}
          index={0}
          highlight
          result={result}
          copied={copied}
          votes={votes}
          onCopy={onCopy}
          onUse={live ? onUse : undefined}
          onVote={onVote}
        />
      )}

      {/* Why, with the "ask about this" button */}
      {result.read && (
        <InsightBlock kind="read" insight={result.read} context={insightContext} history={history}>
          <div className="rounded-lg bg-white/70 py-2 pl-3 pr-10">
            <span className="font-mono text-[10px] uppercase tracking-wider text-coral">
              {isDraftFeedback ? 'What I changed' : result.mode === 'opener' ? 'What to lead with' : "What she's saying"}
            </span>
            <p className="mt-0.5 text-[13px] leading-relaxed text-charcoal">{result.read}</p>
          </div>
        </InsightBlock>
      )}

      {/* More options, tucked away so the chat stays the focus */}
      {alternatives.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer select-none font-mono text-[10px] uppercase tracking-wider text-mutedtext hover:text-coral">
            {alternatives.length} other {alternatives.length === 1 ? 'option' : 'options'}
          </summary>
          <div className="mt-2 space-y-2">
            {alternatives.map((r, i) => (
              <ReplyBlock
                key={i}
                reply={r}
                index={i + 1}
                result={result}
                copied={copied}
                votes={votes}
                onCopy={onCopy}
                onUse={live ? onUse : undefined}
                onVote={onVote}
              />
            ))}
          </div>
        </details>
      )}

      {result.next_move && !isDraftFeedback && (
        <InsightBlock kind="next_move" insight={result.next_move} context={insightContext} history={history}>
          <p className="py-1 pr-10 text-[13px] text-mutedtext">
            <span className="font-mono text-[10px] uppercase tracking-wider text-coral">Next move </span>
            {result.next_move}
          </p>
        </InsightBlock>
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
  onUse,
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
  onUse?: (text: string) => void;
  onVote: (result: Result, index: number, v: 'up' | 'down') => void;
}) {
  const key = `${result.requestId ?? 'x'}-${index}`;
  const myVote = votes[key];
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
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
      <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-charcoal">{reply.text}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {onUse && (
          <button
            onClick={() => onUse(reply.text)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-charcoal px-3 py-1.5 text-xs font-semibold text-cream transition-colors hover:bg-charcoal/90"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Edit &amp; use
          </button>
        )}
        <button
          onClick={() => onCopy(key, reply.text)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-beige-300 px-3 py-1.5 text-xs font-semibold text-charcoal transition-colors hover:bg-beige-50"
        >
          {copied === key ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === key ? 'Copied · added to chat' : 'Copy & send'}
        </button>
      </div>
    </div>
  );
}