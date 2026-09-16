import type { Conversation, ChatMessage, LearningScenario, ProfileInsight, UserProfile } from './types';

export const mockUser: UserProfile = {
  firstName: 'Alex',
  persona: 'intellectual',
  vibeTags: ['intellectual', 'introvert', 'creative'],
  datingApps: ['Hinge', 'Bumble'],
  communicationStyle: 'Thoughtful but tends to overthink',
  currentFocus: 'Getting past the first few messages',
  routingChoice: 'match',
  credits: 1180,
  tier: 'free',
};

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    matchName: 'Sara',
    matchAvatar: 'S',
    stage: 'active',
    lastActivity: '12 min ago',
    preview: "That's a hot take but I respect it",
    messages: [
      {
        id: 'm1',
        role: 'her',
        text: "Okay so you're telling me you think pineapple belongs on pizza?",
        timestamp: '2:14 PM',
      },
      {
        id: 'm2',
        role: 'coach',
        text: 'She picked up on your bio detail and is teasing you about it. This is a playful challenge, not a debate.',
        timestamp: '2:14 PM',
        annotation: { type: 'signal', text: 'Playful challenge — engagement signal' },
      },
      {
        id: 'm3',
        role: 'him',
        text: "Absolutely. Pineapple is the only topping that shows real character. Everything else is just... safe.",
        timestamp: '2:16 PM',
      },
      {
        id: 'm4',
        role: 'coach',
        text: 'Good — you matched her energy and doubled down. Now pivot from the debate to something personal so it doesn\'t become a bit.',
        timestamp: '2:16 PM',
        annotation: { type: 'suggestion', text: 'Pivot from debate to personal' },
      },
      {
        id: 'm5',
        role: 'her',
        text: "That's a hot take but I respect it. What's your actual go-to topping then?",
        timestamp: '2:18 PM',
      },
      {
        id: 'm6',
        role: 'coach',
        text: 'She asked a follow-up question — that\'s a second engagement signal. She\'s investing in the conversation now.',
        timestamp: '2:18 PM',
        annotation: { type: 'signal', text: 'Follow-up question — second engagement signal' },
      },
    ],
  },
  {
    id: 'conv-2',
    matchName: 'Jenna',
    matchAvatar: 'J',
    stage: 'new',
    lastActivity: '1 hour ago',
    preview: "Hey! Love your hiking photos — where was that?",
    messages: [
      {
        id: 'm1',
        role: 'her',
        text: "Hey! Love your hiking photos — where was that?",
        timestamp: '1:02 PM',
      },
      {
        id: 'm2',
        role: 'coach',
        text: 'She opened with a specific question about your photos. That\'s a strong start — she looked at your profile carefully.',
        timestamp: '1:02 PM',
        annotation: { type: 'signal', text: 'Specific question about your photos — strong opener' },
      },
    ],
  },
  {
    id: 'conv-3',
    matchName: 'Mira',
    matchAvatar: 'M',
    stage: 'quiet',
    lastActivity: '2 days ago',
    preview: 'Haha yeah maybe we will 😊',
    messages: [
      {
        id: 'm1',
        role: 'her',
        text: "What do you do for fun? Besides winning pizza debates obviously",
        timestamp: 'Mon 4:30 PM',
      },
      {
        id: 'm2',
        role: 'coach',
        text: 'She\'s keeping it light and referencing your earlier joke. Good sign — she remembers what you said.',
        timestamp: 'Mon 4:30 PM',
        annotation: { type: 'signal', text: 'Callback to earlier joke — she\'s paying attention' },
      },
      {
        id: 'm3',
        role: 'him',
        text: "Mostly I climb, read weird books, and cook things that don't always work out. You?",
        timestamp: 'Mon 4:33 PM',
      },
      {
        id: 'm4',
        role: 'her',
        text: 'Haha yeah maybe we will 😊',
        timestamp: 'Mon 4:35 PM',
      },
      {
        id: 'm5',
        role: 'coach',
        text: 'She responded with an emoji but didn\'t ask a question back. The thread is losing momentum — time to suggest a specific plan.',
        timestamp: 'Mon 4:35 PM',
        annotation: { type: 'insight', text: 'Momentum dropping — suggest a specific plan' },
      },
    ],
  },
];

export const mockSystemMessages: ChatMessage[] = [
  {
    id: 'sys-1',
    role: 'system',
    text: 'Credits reset in 4h 12m · 3 insights used today',
    timestamp: '',
  },
];

export const mockLearningScenarios: LearningScenario[] = [
  {
    id: 'scen-1',
    title: 'Turn a one-word answer into a real conversation',
    type: 'practice',
    description: 'She said "nice" — practice 3 ways to keep it going without forcing it.',
    persona: 'intellectual',
    difficulty: 'easy',
  },
  {
    id: 'scen-2',
    title: 'When she goes quiet after 3 messages',
    type: 'practice',
    description: 'Practice the follow-up that respects her space but keeps the door open.',
    persona: 'introvert',
    difficulty: 'medium',
  },
  {
    id: 'scen-3',
    title: 'Quick read: what does her opener actually tell you?',
    type: 'quiz',
    description: '5 real openers — tap what you think each one signals.',
    persona: 'social',
    difficulty: 'easy',
  },
  {
    id: 'scen-4',
    title: 'Moving from chat to date without making it weird',
    type: 'practice',
    description: 'Practice the transition with a match who\'s been warm but hasn\'t said yes yet.',
    persona: 'entrepreneur',
    difficulty: 'hard',
  },
  {
    id: 'scen-5',
    title: 'Ask me anything about conversation',
    type: 'qa',
    description: 'General coaching Q&A — no scenario, just straight answers.',
    persona: 'intellectual',
    difficulty: 'easy',
  },
];

export const mockProfileInsights: ProfileInsight[] = [
  {
    id: 'insight-1',
    title: 'Your conversations tend to slow down around the same point',
    description: 'Around message 4–5, you stop asking questions and start making statements. The other person has nothing to build on. Try ending your messages with a question 70% of the time.',
    locked: false,
  },
  {
    id: 'insight-2',
    title: 'Your openers are stronger than you think',
    description: 'Your first messages get responses 68% of the time — above average for your apps. The drop-off happens in the follow-up, not the opener.',
    locked: false,
  },
  {
    id: 'insight-3',
    title: 'You match well with creative introverts',
    description: 'Your longest conversations are with women who list reading, art, or music as interests. Your worst are with pure extroverts — the energy mismatch shows up by message 3.',
    locked: false,
  },
  {
    id: 'insight-4',
    title: 'Your escalation timing pattern',
    description: 'You suggest meeting up after an average of 11 messages. Your successful transitions happen at message 6–8. You\'re waiting too long.',
    locked: true,
    category: 'Escalation',
  },
  {
    id: 'insight-5',
    title: 'Weekly consistency trend',
    description: 'You start strong on Mondays but drop off by Thursday. Your best conversations happen when you check in daily, even briefly.',
    locked: true,
    category: 'Consistency',
  },
  {
    id: 'insight-6',
    title: 'Opener variety scorecard',
    description: 'You\'ve used the same opener structure 14 times this month. Your response rate drops when you repeat — variety matters more than perfection.',
    locked: true,
    category: 'Openers',
  },
];
