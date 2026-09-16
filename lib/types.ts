import type { PersonaId, VibeTag } from './brand';

export interface UserProfile {
  firstName: string;
  persona: PersonaId;
  vibeTags: VibeTag[];
  datingApps: string[];
  communicationStyle: string;
  currentFocus: string;
  routingChoice: 'match' | 'practice';
  credits: number;
  tier: 'free' | 'premium' | 'elite';
}

export type MessageRole = 'her' | 'him' | 'coach' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: string;
  annotation?: {
    type: 'insight' | 'signal' | 'suggestion';
    text: string;
  };
}

export interface Conversation {
  id: string;
  matchName: string;
  matchAvatar: string;
  stage: 'new' | 'active' | 'quiet';
  lastActivity: string;
  preview: string;
  messages: ChatMessage[];
}

export interface LearningScenario {
  id: string;
  title: string;
  type: 'practice' | 'quiz' | 'qa';
  description: string;
  persona: PersonaId;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ProfileInsight {
  id: string;
  title: string;
  description: string;
  locked: boolean;
  category?: string;
}
