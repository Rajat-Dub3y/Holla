import { format, formatDistanceToNow, isBefore, subHours } from 'date-fns';
import type { User as FirebaseUser } from 'firebase/auth';
import type { ChatMessage, Conversation, ProfileInsight, UserProfile } from '@/lib/types';
import type { PersonaId, VibeTag } from '@/lib/brand';

export interface MeResponse {
  user: {
    datingApps: string[];
    subscriptionTier: 'free' | 'premium' | 'elite';
  };
  persona: {
    vibeTags: string[];
    communicationStyle: string | null;
    focusArea: string | null;
    personaId: string | null;
    matchOrPractice: string | null;
  } | null;
  creditBalance: {
    analyzeCreditsRemaining: number;
    dailyResetAt: string;
  } | null;
}

const STYLE_LABELS: Record<string, string> = {
  direct: 'Direct and confident',
  direct_confident: 'Direct and confident',
  thoughtful: 'Thoughtful but I overthink',
  playful: 'Playful and casual',
  quiet: 'Quiet until I warm up',
};

const FOCUS_LABELS: Record<string, string> = {
  openers: 'Starting conversations',
  keeping: 'Keeping them going',
  keeping_conversations_moving: 'Keeping them going',
  dates: 'Moving to a date',
  confidence: 'Not knowing what to say',
};

function displayValue(value: string | null | undefined, labels: Record<string, string>) {
  if (!value) return '';
  return labels[value] ?? value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

export function meToUserProfile(me: MeResponse, firebaseUser: FirebaseUser): UserProfile {
  const tier = me.user.subscriptionTier;
  return {
    firstName: firebaseUser.displayName?.split(' ')[0] ?? 'there',
    persona: (me.persona?.personaId as PersonaId | null) ?? 'entrepreneur',
    vibeTags: (me.persona?.vibeTags ?? []) as VibeTag[],
    datingApps: me.user.datingApps.map((app) => app.charAt(0).toUpperCase() + app.slice(1)),
    communicationStyle: displayValue(me.persona?.communicationStyle, STYLE_LABELS),
    currentFocus: displayValue(me.persona?.focusArea, FOCUS_LABELS),
    routingChoice: me.persona?.matchOrPractice === 'practice' ? 'practice' : 'match',
    credits: tier === 'free' ? me.creditBalance?.analyzeCreditsRemaining ?? 0 : Infinity,
    tier,
    dailyResetAt: me.creditBalance?.dailyResetAt ?? null,
  };
}

export interface ThreadRow {
  id: string;
  matchLabel: string;
  status: 'active' | 'archived' | 'gone_cold';
  whoOpened: 'her' | 'him' | null;
  lastActivityAt: string;
  createdAt: string;
  preview: string;
  lastMessageSender?: 'user' | 'match' | null;
  hasUserMessage?: boolean;
}

export interface MessageRow {
  id: string;
  sender: 'user' | 'match' | 'coach_annotation' | 'coach_system';
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function threadToConversation(thread: ThreadRow, messages: MessageRow[] = []): Conversation {
  const lastUserMessage = thread.hasUserMessage ?? messages.some((message) => message.sender === 'user');
  const lastActivity = new Date(thread.lastActivityAt);
  const stage = !lastUserMessage
    ? 'new'
    : isBefore(lastActivity, subHours(new Date(), 48))
      ? 'quiet'
      : 'active';

  return {
    id: thread.id,
    matchName: thread.matchLabel,
    matchAvatar: thread.matchLabel.charAt(0).toUpperCase(),
    stage,
    lastActivity: formatDistanceToNow(lastActivity, { addSuffix: true }),
    preview: thread.preview,
    messages: messageToChatMessages(messages),
    status: thread.status,
  };
}

export function messageToChatMessages(rows: MessageRow[]): ChatMessage[] {
  return rows.flatMap((row) => {
    const timestamp = new Date(row.createdAt);
    const time = isBefore(timestamp, subHours(new Date(), 24))
      ? format(timestamp, 'EEE h:mm a')
      : format(timestamp, 'h:mm a');
    if (row.sender === 'match') {
      return [{ id: row.id, role: 'her', text: row.content === '[screenshot]' ? 'Screenshot shared' : row.content, timestamp: time }];
    }
    if (row.sender === 'user') {
      return [{ id: row.id, role: 'him', text: row.content, timestamp: time }];
    }
    if (row.sender === 'coach_system') {
      return [{ id: row.id, role: 'system', text: row.content, timestamp: time }];
    }
    const metadata = row.metadata ?? {};
    const messages: ChatMessage[] = [];
    if (typeof metadata.insight === 'string') {
      messages.push({ id: `${row.id}-insight`, role: 'coach', text: metadata.insight, timestamp: time, annotation: { type: 'signal' } });
      if (typeof metadata.nextStepPrompt === 'string') {
        messages.push({ id: `${row.id}-suggestion`, role: 'coach', text: metadata.nextStepPrompt, timestamp: time, annotation: { type: 'suggestion' } });
      }
    } else if (typeof metadata.encouragement === 'string') {
      messages.push({ id: row.id, role: 'coach', text: metadata.encouragement, timestamp: time, annotation: { type: 'insight' } });
    }
    return messages;
  });
}

export function insightToProfileInsight(row: {
  id: string;
  category: string | null;
  title: string;
  body: string | null;
  isLocked: boolean;
}): ProfileInsight {
  return {
    id: row.id,
    title: row.title,
    description: row.body ?? '',
    locked: row.isLocked,
    category: row.category ? row.category.charAt(0).toUpperCase() + row.category.slice(1) : undefined,
  };
}
