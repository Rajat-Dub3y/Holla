export const BRAND = {
  name: 'Holla',
  tagline: 'Your AI dating conversation coach',
} as const;

export type PersonaId =
  | 'intellectual'
  | 'athlete'
  | 'social'
  | 'introvert'
  | 'entrepreneur';

export type VibeTag =
  | 'intellectual'
  | 'athlete'
  | 'social'
  | 'introvert'
  | 'entrepreneur'
  | 'creative'
  | 'gamer'
  | 'traveller'
  | 'spiritual'
  | 'professional'
  | 'funny';

export interface PersonaConfig {
  id: PersonaId;
  label: string;
  tagline: string;
  dashboardTone: string;
  featuredPrompt: string;
  accentColor: string;
}

export const PERSONAS: Record<PersonaId, PersonaConfig> = {
  intellectual: {
    id: 'intellectual',
    label: 'Intellectual',
    tagline: 'Ideas over small talk',
    dashboardTone: 'Sharp, curious, a little dry.',
    featuredPrompt: 'Turn her one-word answer into a real conversation',
    accentColor: '#3D6B4F',
  },
  athlete: {
    id: 'athlete',
    label: 'Athlete',
    tagline: 'Energy and momentum',
    dashboardTone: 'Direct, high-energy, no overthinking.',
    featuredPrompt: 'Keep the energy up without coming on too strong',
    accentColor: '#E8623A',
  },
  social: {
    id: 'social',
    label: 'Social',
    tagline: 'Easy with people',
    dashboardTone: 'Warm, playful, reads the room.',
    featuredPrompt: 'Match her vibe without mirroring too hard',
    accentColor: '#5A8A6B',
  },
  introvert: {
    id: 'introvert',
    label: 'Introvert',
    tagline: 'Depth over volume',
    dashboardTone: 'Thoughtful, patient, low-pressure.',
    featuredPrompt: 'Ask one good question instead of ten surface ones',
    accentColor: '#8F7D53',
  },
  entrepreneur: {
    id: 'entrepreneur',
    label: 'Entrepreneur',
    tagline: 'Builds things, moves fast',
    dashboardTone: 'Confident, efficient, outcome-oriented.',
    featuredPrompt: 'Move from the chat to the date without forcing it',
    accentColor: '#B39D68',
  },
};

export const ALL_VIBE_TAGS: { id: VibeTag; label: string }[] = [
  { id: 'intellectual', label: 'Intellectual' },
  { id: 'athlete', label: 'Athlete' },
  { id: 'social', label: 'Social' },
  { id: 'introvert', label: 'Introvert' },
  { id: 'entrepreneur', label: 'Entrepreneur' },
  { id: 'creative', label: 'Creative' },
  { id: 'gamer', label: 'Gamer' },
  { id: 'traveller', label: 'Traveller' },
  { id: 'spiritual', label: 'Spiritual' },
  { id: 'professional', label: 'Professional' },
  { id: 'funny', label: 'Funny' },
];

export const COACHES = [
  { name: 'Maya Chen', role: 'Conversation Strategist', credential: '10 yrs coaching' },
  { name: 'James Okafor', role: 'Social Dynamics', credential: 'Behavioral science' },
  { name: 'Priya Sharma', role: 'Communication Coach', credential: '5,000+ sessions' },
  { name: 'Diego Ruiz', role: 'Dating Psychology', credential: 'Clinical background' },
];

export const PRICING_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with daily coaching credits',
    features: [
      '5 analyses per day',
      'Two active conversations',
      'Basic conversation insights',
      'Community learning scenarios',
    ],
    cta: 'Start free',
    highlight: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$10',
    period: 'per month',
    description: 'Unlimited coaching, deeper insights',
    features: [
      'Unlimited coaching credits',
      'Unlimited active conversations',
      'Full growth scorecard (Openers, Escalation, Consistency)',
      'Weekly digest with personalized trends',
      'All learning scenarios unlocked',
      'Priority coach responses',
    ],
    cta: 'Go Premium',
    highlight: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '$24.99',
    period: 'per month',
    description: 'Romeo AI — your always-on conversation partner',
    features: [
      'Everything in Premium',
      'Romeo AI — real-time conversation copilot',
      'Screenshot analysis with instant coaching',
      'Custom persona training',
      'Direct access to named coaches',
      'Early access to new features',
    ],
    cta: 'Coming soon',
    highlight: false,
    locked: true,
  },
];
