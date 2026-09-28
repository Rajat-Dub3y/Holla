'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import { Archive, ArrowLeft, Camera, ClipboardPaste, Clock, Plus, Send, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { ApiError, apiFetch } from '@/lib/api-client';
import { messageToChatMessages, threadToConversation, type MessageRow, type ThreadRow } from '@/lib/adapters';
import { useMe } from '@/lib/use-me';
import type { ChatMessage, Conversation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ThreadListResponse { threads: ThreadRow[] }
interface ThreadDetailResponse { thread: ThreadRow; messages: MessageRow[] }

export function ChatWorkspace() {
  return <Suspense fallback={<div className="min-h-screen bg-cream" />}><ChatScreen /></Suspense>;
}

function ChatScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate: globalMutate } = useSWRConfig();
  const { profile } = useMe();
  const selectedId = searchParams.get('t');
  const [isDesktop, setIsDesktop] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [matchLabel, setMatchLabel] = useState('');
  const [whoOpened, setWhoOpened] = useState<'her' | 'him'>('her');
  const [creating, setCreating] = useState(false);

  const { data: listData, error: listError, isLoading: listLoading, mutate: mutateList } = useSWR<ThreadListResponse>('/api/threads', apiFetch);
  const threads = listData?.threads ?? [];
  const visibleThreads = useMemo(() => threads.filter((thread) => showArchived || thread.status !== 'archived'), [showArchived, threads]);
  const selectedThread = threads.find((thread) => thread.id === selectedId);
  const { data: detail, isLoading: detailLoading, mutate: mutateDetail } = useSWR<ThreadDetailResponse>(selectedId ? `/api/threads/${selectedId}` : null, apiFetch);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (isDesktop && !selectedId && threads.length) {
      const first = threads.find((thread) => thread.status !== 'archived') ?? threads[0];
      router.replace(`/chat?t=${first.id}`);
    }
  }, [isDesktop, router, selectedId, threads]);

  const selectThread = (id: string) => router.push(`/chat?t=${id}`);
  const conversation: Conversation | null = selectedThread ? threadToConversation(selectedThread, detail?.messages ?? []) : null;

  const createThread = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!matchLabel.trim()) return;
    setCreating(true);
    try {
      const result = await apiFetch<{ thread: ThreadRow }>('/api/threads', { method: 'POST', body: JSON.stringify({ matchLabel: matchLabel.trim(), whoOpened }) });
      setNewDialogOpen(false);
      setMatchLabel('');
      await mutateList();
      selectThread(result.thread.id);
    } catch (error) {
      if (error instanceof ApiError && error.status === 402 && error.body.error === 'thread_cap') {
        toast.error('Focus on your top 2 conversations. Archive one or upgrade.', { action: { label: 'Upgrade', onClick: () => router.push('/pricing') } });
      } else toast.error('Could not create the conversation. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const archiveThread = async () => {
    if (!selectedId) return;
    try {
      await apiFetch(`/api/threads/${selectedId}`, { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) });
      await mutateList();
      router.replace('/chat');
    } catch {
      toast.error('Could not archive this conversation.');
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-0 py-0 md:px-8 md:py-6">
        <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-72px)]">
          <aside className={cn('w-full shrink-0 border-r border-beige-200 bg-cream md:w-72', selectedId ? 'hidden md:block' : 'block')}>
            <div className="flex items-center justify-between border-b border-beige-200 p-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-charcoal">Conversations</h2>
                <button onClick={() => setShowArchived((current) => !current)} className="mt-1 font-mono text-[10px] text-mutedtext hover:text-charcoal">{showArchived ? 'Hide archived' : 'Archived'}</button>
              </div>
              <button onClick={() => setNewDialogOpen(true)} title="New conversation" className="flex h-9 w-9 items-center justify-center rounded-lg bg-coral text-cream transition-colors hover:bg-coral-dark"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1 p-3">
              {listLoading && <ThreadListSkeleton />}
              {listError && <p className="p-3 text-sm text-mutedtext">Could not load conversations.</p>}
              {!listLoading && !listError && visibleThreads.map((thread) => <ThreadListItem key={thread.id} conv={threadToConversation(thread)} active={thread.id === selectedId} onClick={() => selectThread(thread.id)} />)}
              {!listLoading && !listError && visibleThreads.length === 0 && <div className="px-3 py-8 text-center"><p className="text-sm text-mutedtext">Start your first conversation</p><button onClick={() => setNewDialogOpen(true)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-cream hover:bg-coral-dark"><Plus className="h-4 w-4" />New conversation</button></div>}
            </div>
          </aside>

          <section className={cn('min-w-0 flex-1 flex-col', selectedId ? 'flex' : 'hidden md:flex')}>
            {selectedId && conversation ? <ConversationPanel
              key={selectedId}
              id={selectedId}
              thread={selectedThread!}
              detail={detail}
              loading={detailLoading}
              conversation={conversation}
              credits={profile?.credits ?? 0}
              dailyResetAt={profile?.dailyResetAt ?? null}
              onBack={() => router.push('/chat')}
              onArchive={archiveThread}
              onMutate={async () => { await Promise.all([mutateDetail(), mutateList(), globalMutate('/api/user/me')]); }}
            /> : selectedId && detailLoading ? <div className="flex flex-1 items-center justify-center text-sm text-mutedtext">Loading conversation...</div> : <div className="flex flex-1 items-center justify-center text-sm text-mutedtext">{listLoading ? 'Loading conversations...' : 'Choose a conversation to get started.'}</div>}
          </section>
        </div>
      </div>

      {newDialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setNewDialogOpen(false); }}>
        <form onSubmit={createThread} className="w-full max-w-sm rounded-xl border border-beige-200 bg-cream p-5 shadow-xl">
          <h2 className="font-serif text-xl font-bold text-charcoal">New conversation</h2>
          <label className="mt-5 block text-sm font-medium text-charcoal" htmlFor="match-label">Name</label>
          <input id="match-label" value={matchLabel} onChange={(event) => setMatchLabel(event.target.value)} autoFocus className="mt-2 w-full rounded-lg border border-beige-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-coral" />
          <fieldset className="mt-4"><legend className="mb-2 text-sm font-medium text-charcoal">Who opened?</legend><div className="flex gap-4 text-sm text-mutedtext"><label className="flex items-center gap-2"><input type="radio" checked={whoOpened === 'her'} onChange={() => setWhoOpened('her')} />She did</label><label className="flex items-center gap-2"><input type="radio" checked={whoOpened === 'him'} onChange={() => setWhoOpened('him')} />I did</label></div></fieldset>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setNewDialogOpen(false)} className="rounded-lg border border-beige-300 px-4 py-2 text-sm text-charcoal">Cancel</button><button disabled={!matchLabel.trim() || creating} className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">{creating ? 'Creating...' : 'Create'}</button></div>
        </form>
      </div>}
    </AppShell>
  );
}

function ThreadListSkeleton() {
  return <div className="space-y-3 p-3">{[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-beige-100" />)}</div>;
}

function ThreadListItem({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={cn('w-full rounded-xl p-3 text-left transition-colors', active ? 'bg-beige-200' : 'hover:bg-beige-100')}><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-beige-300 font-serif text-sm font-bold text-beige-900">{conv.matchAvatar}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-charcoal">{conv.matchName}</p><span className="shrink-0 font-mono text-[10px] text-mutedtext">{conv.lastActivity}</span></div><p className="truncate text-xs text-mutedtext">{conv.preview || 'No messages yet'}</p></div></div></button>;
}

function ConversationPanel({ id, thread, detail, loading, conversation, credits, dailyResetAt, onBack, onArchive, onMutate }: {
  id: string;
  thread: ThreadRow;
  detail?: ThreadDetailResponse;
  loading: boolean;
  conversation: Conversation;
  credits: number;
  dailyResetAt: string | null;
  onBack: () => void;
  onArchive: () => void;
  onMutate: () => Promise<void>;
}) {
  const [mode, setMode] = useState<'text' | null>(null);
  const [messageText, setMessageText] = useState('');
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCreditCap, setShowCreditCap] = useState(false);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const exchangeMessages = detail?.messages.filter((message) => message.sender === 'match' || message.sender === 'user') ?? [];
  const lastExchange = exchangeMessages[exchangeMessages.length - 1];
  const hisTurn = lastExchange?.sender === 'match' || (!lastExchange && thread.whoOpened === 'him');
  const chatMessages = detail ? messageToChatMessages(detail.messages) : [];

  const handleFailure = (error: unknown) => {
    if (error instanceof ApiError && error.status === 402 && error.body.error === 'no_credits') {
      setResetAt(typeof error.body.dailyResetAt === 'string' ? error.body.dailyResetAt : null);
      setShowCreditCap(true);
    } else toast.error('Something went wrong. Please try again.');
  };

  const analyzeMessage = async (payload: Record<string, string>) => {
    setBusy(true);
    try {
      const result = await apiFetch<{ error?: string }>(`/api/threads/${id}/messages`, { method: 'POST', body: JSON.stringify(payload) });
      if (result.error === 'analysis_failed') toast.error("Couldn't generate an insight. Your credit was returned. Try again.");
      setMessageText('');
      setMode(null);
      setShowCreditCap(false);
      await onMutate();
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const submitText = async (event: React.FormEvent) => {
    event.preventDefault();
    if (messageText.trim()) await analyzeMessage({ type: 'text', content: messageText.trim() });
  };

  const submitScreenshot = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      await analyzeMessage({ type: 'screenshot', imageBase64: await downscaleImage(file), mimeType: 'image/jpeg' });
    } catch (error) {
      handleFailure(error);
      setBusy(false);
    }
  };

  const checkDraft = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    setFeedback('');
    try {
      const result = await apiFetch<{ feedback: string }>(`/api/threads/${id}/draft-feedback`, { method: 'POST', body: JSON.stringify({ draftText: draft.trim() }) });
      setFeedback(result.feedback);
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  const sendDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/api/threads/${id}/send`, { method: 'POST', body: JSON.stringify({ content: draft.trim() }) });
      setDraft('');
      setFeedback('');
      await onMutate();
    } catch (error) {
      handleFailure(error);
    } finally {
      setBusy(false);
    }
  };

  return <>
    <div className="flex items-center justify-between border-b border-beige-200 bg-cream px-4 py-3 md:px-6"><div className="flex items-center gap-3"><button onClick={onBack} className="text-mutedtext hover:text-charcoal md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" /></button><div className="flex h-9 w-9 items-center justify-center rounded-full bg-beige-300 font-serif text-sm font-bold text-beige-900">{conversation.matchAvatar}</div><div><p className="font-semibold text-charcoal">{conversation.matchName}</p><p className="font-mono text-xs text-mutedtext">{conversation.lastActivity}</p></div></div><div className="flex items-center gap-2"><span className={cn('rounded-full px-2.5 py-1 font-mono text-xs', conversation.stage === 'active' ? 'bg-sage/15 text-sage-dark' : conversation.stage === 'new' ? 'bg-coral/15 text-coral' : 'bg-beige-200 text-mutedtext')}>{conversation.stage === 'active' ? 'Active' : conversation.stage === 'new' ? 'New' : 'Gone quiet'}</span>{thread.status !== 'archived' && <button onClick={onArchive} title="Archive conversation" className="flex h-8 w-8 items-center justify-center rounded-lg text-mutedtext hover:bg-beige-100 hover:text-charcoal"><Archive className="h-4 w-4" /></button>}</div></div>

    <div className="flex-1 overflow-y-auto bg-cream/50 px-4 py-4 md:px-6"><div className="mx-auto max-w-2xl space-y-3">{loading && <div className="h-20 animate-pulse rounded-xl bg-beige-100" />}{!loading && chatMessages.map((message) => <MessageRenderer key={message.id} msg={message} />)}{!loading && !exchangeMessages.length && thread.whoOpened === 'him' && <div className="rounded-xl border border-beige-200 bg-beige-50 p-4 text-sm text-mutedtext">Opener suggestions are coming soon.</div>}{showCreditCap && <CreditCapState dailyResetAt={resetAt ?? dailyResetAt} />}</div></div>

    <div className="border-t border-beige-200 bg-cream px-4 py-3 md:px-6"><div className="mx-auto max-w-2xl">{hisTurn ? <form onSubmit={sendDraft}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write your reply..." rows={3} className="w-full resize-y rounded-xl border border-beige-300 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-coral" />{feedback && <div className="mt-2 rounded-lg border-l-2 border-coral bg-beige-50 px-3 py-2 text-xs leading-relaxed text-charcoal">{feedback}</div>}<div className="mt-2 flex items-center justify-between gap-2"><button type="button" onClick={checkDraft} disabled={busy || !draft.trim()} className="rounded-lg border border-beige-300 px-3 py-2 text-xs font-semibold text-charcoal disabled:opacity-50">Check my draft</button><button disabled={busy || !draft.trim()} className="inline-flex items-center gap-2 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">Send <Send className="h-4 w-4" /></button></div></form> : <>{mode === 'text' ? <form onSubmit={submitText}><textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Paste her message..." rows={3} className="w-full resize-y rounded-xl border border-beige-300 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-coral" /><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setMode(null)} className="rounded-lg border border-beige-300 px-4 py-2 text-sm text-charcoal">Cancel</button><button disabled={busy || !messageText.trim()} className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50">{busy ? 'Analyzing...' : 'Analyze'}</button></div></form> : <div className="rounded-xl border border-beige-300 bg-white p-4"><p className="mb-3 text-sm font-semibold text-charcoal">Has she replied yet?</p><div className="flex flex-col gap-2 sm:flex-row"><button onClick={() => setMode('text')} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-beige-300 px-4 py-2.5 text-sm text-mutedtext hover:bg-beige-50"><ClipboardPaste className="h-4 w-4" />Paste her text</button><label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-beige-300 px-4 py-2.5 text-sm text-mutedtext hover:bg-beige-50"><Camera className="h-4 w-4" />{busy ? 'Analyzing...' : 'Upload screenshot'}<input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(event) => submitScreenshot(event.target.files?.[0])} /></label></div></div>}<div className="mt-2 flex items-center justify-between"><p className="font-mono text-xs text-mutedtext">{dailyResetAt ? `Resets in ${formatDistanceToNow(new Date(dailyResetAt))} · ` : ''}{Number.isFinite(credits) ? `${credits} analyses left` : 'Unlimited analyses'}</p><Link href="/learn" className="font-mono text-xs text-coral hover:underline">Practice instead →</Link></div></>}</div></div>
  </>;
}

function MessageRenderer({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'her' || msg.role === 'him') {
    const isHer = msg.role === 'her';
    return <div className={cn('flex', isHer ? 'justify-start' : 'justify-end')}><div className="max-w-[80%]"><div className={cn('rounded-2xl px-4 py-3 text-sm text-charcoal shadow-sm', isHer ? 'rounded-tl-sm bg-white' : 'rounded-tr-sm bg-beige-400')}>{msg.text}</div><p className={cn('mt-1 font-mono text-[10px] text-mutedtext', isHer ? 'pl-1' : 'pr-1 text-right')}>{msg.timestamp}</p></div></div>;
  }
  if (msg.role === 'coach') return <div className="flex justify-start pl-2"><div className="max-w-[85%]"><div className="rounded-lg border-l-2 border-coral bg-beige-50 px-3 py-2.5"><div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-coral">{msg.annotation?.type === 'signal' ? 'Signal' : msg.annotation?.type === 'suggestion' ? 'Next move' : 'Insight'}</div><p className="text-xs leading-relaxed text-charcoal">{msg.text}</p></div>{msg.annotation?.text && <p className="mt-1 pl-1 font-mono text-[10px] text-mutedtext">{msg.annotation.text}</p>}</div></div>;
  return <div className="flex justify-center py-2"><div className="flex items-center gap-2 rounded-full bg-beige-100 px-3 py-1.5"><Zap className="h-3 w-3 text-coral" /><span className="font-mono text-xs text-mutedtext">{msg.text}</span></div></div>;
}

function CreditCapState({ dailyResetAt }: { dailyResetAt: string | null }) {
  const reset = dailyResetAt ? `Wait for reset (${formatDistanceToNow(new Date(dailyResetAt))})` : 'Wait for daily reset';
  return <div className="relative overflow-hidden rounded-xl border border-beige-300 bg-beige-50 p-4"><div className="blur-cap"><div className="rounded-lg border-l-2 border-coral bg-white px-3 py-2.5"><span className="font-mono text-[10px] uppercase tracking-wider text-coral">Next move</span><p className="mt-1 text-xs leading-relaxed text-charcoal">A thoughtful response can acknowledge what she shared, then add one specific detail of your own.</p></div></div><div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><div className="flex items-center gap-2 text-mutedtext"><Clock className="h-4 w-4" /><span className="font-mono text-xs">You&apos;re out of coaching credits for today</span></div><div className="flex flex-col gap-2 sm:flex-row"><span className="rounded-lg border border-beige-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal">{reset}</span><Link href="/pricing" className="rounded-lg bg-coral px-4 py-2 text-center text-sm font-semibold text-cream hover:bg-coral-dark">Upgrade now</Link></div><Link href="/learn" className="font-mono text-xs text-coral hover:underline">Or practice with free scenarios →</Link></div></div>;
}

async function downscaleImage(file: File): Promise<string> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not process the image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not process the image.')), 'image/jpeg', 0.8));
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read the image.'));
      reader.readAsDataURL(blob);
    });
    return dataUrl.split(',', 2)[1];
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
