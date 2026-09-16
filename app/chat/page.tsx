'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardPaste, Camera, Zap, Clock, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { CreditPill } from '@/components/credit-pill';
import { BRAND } from '@/lib/brand';
import { mockConversations, mockSystemMessages } from '@/lib/mock-data';
import type { Conversation, ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const [activeConvId, setActiveConvId] = useState(mockConversations[0].id);
  const [showCreditCap, setShowCreditCap] = useState(false);
  const [showReplyPrompt, setShowReplyPrompt] = useState(false);

  const activeConv = mockConversations.find((c) => c.id === activeConvId) ?? mockConversations[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-0 py-0 md:px-8 md:py-6">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-beige-200 px-6 py-3 md:hidden">
          <Link href="/home" className="text-mutedtext hover:text-charcoal">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-serif text-lg font-bold text-charcoal">{BRAND.name}</span>
          <CreditPill credits={1180} />
        </div>

        <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-72px)]">
          {/* Desktop thread list */}
          <aside className="hidden w-72 shrink-0 border-r border-beige-200 bg-cream md:block">
            <div className="p-4">
              <h2 className="mb-3 font-serif text-lg font-bold text-charcoal">Conversations</h2>
              <div className="space-y-1">
                {mockConversations.map((conv) => (
                  <ThreadListItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === activeConvId}
                    onClick={() => setActiveConvId(conv.id)}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* Active conversation */}
          <div className="flex flex-1 flex-col">
            {/* Conversation header */}
            <div className="flex items-center justify-between border-b border-beige-200 bg-cream px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-beige-300 font-serif text-sm font-bold text-beige-900">
                  {activeConv.matchAvatar}
                </div>
                <div>
                  <p className="font-semibold text-charcoal">{activeConv.matchName}</p>
                  <p className="font-mono text-xs text-mutedtext">{activeConv.lastActivity}</p>
                </div>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 font-mono text-xs',
                  activeConv.stage === 'active'
                    ? 'bg-sage/15 text-sage-dark'
                    : activeConv.stage === 'new'
                      ? 'bg-coral/15 text-coral'
                      : 'bg-beige-200 text-mutedtext'
                )}
              >
                {activeConv.stage === 'active' ? 'Active' : activeConv.stage === 'new' ? 'New' : 'Gone quiet'}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-cream/50 px-4 py-4 md:px-6">
              <div className="mx-auto max-w-2xl space-y-3">
                {activeConv.messages.map((msg) => (
                  <MessageRenderer key={msg.id} msg={msg} />
                ))}

                {/* System feed messages */}
                {mockSystemMessages.map((msg) => (
                  <MessageRenderer key={msg.id} msg={msg} />
                ))}

                {/* Credit cap state */}
                {showCreditCap && <CreditCapState />}

                {/* Reply prompt */}
                {showReplyPrompt && <ReplyPrompt />}
              </div>
            </div>

            {/* Input area */}
            <div className="border-t border-beige-200 bg-cream px-4 py-3 md:px-6">
              <div className="mx-auto max-w-2xl">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowReplyPrompt(!showReplyPrompt)}
                    className="flex flex-1 items-center gap-2 rounded-xl border border-beige-300 bg-white px-4 py-3 text-left text-sm text-mutedtext transition-colors hover:bg-beige-50"
                  >
                    Paste her message or upload screenshot...
                  </button>
                  <button
                    onClick={() => setShowCreditCap(true)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-coral text-cream transition-colors hover:bg-coral-dark"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-mono text-xs text-mutedtext">
                    3 insights used today · 17 remaining
                  </p>
                  <Link href="/learn" className="font-mono text-xs text-coral hover:underline">
                    Practice instead →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ThreadListItem({
  conv,
  active,
  onClick,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-xl p-3 text-left transition-colors',
        active ? 'bg-beige-200' : 'hover:bg-beige-100'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-beige-300 font-serif text-sm font-bold text-beige-900">
          {conv.matchAvatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-semibold text-charcoal">{conv.matchName}</p>
            <span className="shrink-0 font-mono text-[10px] text-mutedtext">{conv.lastActivity}</span>
          </div>
          <p className="truncate text-xs text-mutedtext">{conv.preview}</p>
        </div>
      </div>
    </button>
  );
}

function MessageRenderer({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'her') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%]">
          <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-charcoal shadow-sm">
            {msg.text}
          </div>
          <p className="mt-1 pl-1 font-mono text-[10px] text-mutedtext">{msg.timestamp}</p>
        </div>
      </div>
    );
  }

  if (msg.role === 'him') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="rounded-2xl rounded-tr-sm bg-beige-400 px-4 py-3 text-sm text-charcoal shadow-sm">
            {msg.text}
          </div>
          <p className="mt-1 pr-1 text-right font-mono text-[10px] text-mutedtext">{msg.timestamp}</p>
        </div>
      </div>
    );
  }

  if (msg.role === 'coach') {
    return (
      <div className="flex justify-start pl-2">
        <div className="max-w-[85%]">
          <div className="rounded-lg border-l-2 border-coral bg-beige-50 px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-coral">
                {msg.annotation?.type === 'signal' ? 'Signal' : msg.annotation?.type === 'suggestion' ? 'Next move' : 'Insight'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-charcoal">{msg.text}</p>
          </div>
          {msg.annotation && (
            <p className="mt-1 pl-1 font-mono text-[10px] text-mutedtext">
              {msg.annotation.text}
            </p>
          )}
        </div>
      </div>
    );
  }

  // System/center-feed
  return (
    <div className="flex justify-center py-2">
      <div className="flex items-center gap-2 rounded-full bg-beige-100 px-3 py-1.5">
        <Zap className="h-3 w-3 text-coral" />
        <span className="font-mono text-xs text-mutedtext">{msg.text}</span>
      </div>
    </div>
  );
}

function CreditCapState() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-beige-300 bg-beige-50 p-4">
      <div className="blur-cap">
        <div className="rounded-lg border-l-2 border-coral bg-white px-3 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-coral">Next move</span>
          <p className="mt-1 text-xs leading-relaxed text-charcoal">
            She&apos;s giving you two engagement signals in a row — this is your window.
            Ask about something specific she mentioned (the pizza thing works) and
            add a light callback to your earlier joke. Keep it to 1–2 sentences max.
          </p>
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2 text-mutedtext">
          <Clock className="h-4 w-4" />
          <span className="font-mono text-xs">You&apos;re out of coaching credits for today</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="rounded-lg border border-beige-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal transition-colors hover:bg-beige-100">
            Wait for reset (4h 12m)
          </button>
          <Link
            href="/pricing"
            className="rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark"
          >
            Upgrade now
          </Link>
        </div>
        <Link href="/learn" className="font-mono text-xs text-coral hover:underline">
          Or practice with free scenarios →
        </Link>
      </div>
    </div>
  );
}

function ReplyPrompt() {
  return (
    <div className="rounded-xl border border-beige-300 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-charcoal">Has she replied yet?</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-beige-300 px-4 py-2.5 text-sm text-mutedtext transition-colors hover:bg-beige-50">
          <ClipboardPaste className="h-4 w-4" />
          Paste her text
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-beige-300 px-4 py-2.5 text-sm text-mutedtext transition-colors hover:bg-beige-50">
          <Camera className="h-4 w-4" />
          Upload screenshot
        </button>
      </div>
    </div>
  );
}
