'use client';

import { useState } from 'react';
import { ArrowRight, ArrowLeft, Check, RotateCcw } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { CreditPill } from '@/components/credit-pill';
import { BRAND } from '@/lib/brand';
import { mockLearningScenarios } from '@/lib/mock-data';
import type { LearningScenario } from '@/lib/types';
import { cn } from '@/lib/utils';

type View = 'list' | 'scenario' | 'quiz';

export default function LearnPage() {
  const [view, setView] = useState<View>('list');
  const [activeScenario, setActiveScenario] = useState<LearningScenario | null>(null);

  const openScenario = (scenario: LearningScenario) => {
    setActiveScenario(scenario);
    setView(scenario.type === 'quiz' ? 'quiz' : 'scenario');
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-6 md:px-8 md:py-10">
        {/* Mobile top bar */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <span className="font-serif text-xl font-bold text-charcoal">{BRAND.name}</span>
          <CreditPill credits={1180} />
        </div>

        {view === 'list' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <p className="font-mono text-xs uppercase tracking-widest text-coral">
                Learning
              </p>
              <h1 className="mt-1 font-serif text-3xl font-bold text-charcoal md:text-4xl">
                Get better between conversations
              </h1>
              <p className="mt-2 text-sm text-mutedtext">
                Practice scenarios, quick quizzes, and straight answers — built around your vibe.
              </p>
            </div>

            <div className="space-y-3">
              {mockLearningScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => openScenario(scenario)}
                  className="group flex w-full items-center justify-between rounded-xl border border-beige-200 bg-white p-4 text-left transition-all hover:border-beige-300 hover:shadow-sm"
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                          scenario.type === 'practice'
                            ? 'bg-coral/15 text-coral'
                            : scenario.type === 'quiz'
                              ? 'bg-sage/15 text-sage-dark'
                              : 'bg-beige-200 text-beige-800'
                        )}
                      >
                        {scenario.type === 'practice' ? 'Practice' : scenario.type === 'quiz' ? 'Quiz' : 'Q&A'}
                      </span>
                      <span className="font-mono text-[10px] text-mutedtext">
                        {scenario.difficulty}
                      </span>
                    </div>
                    <h3 className="font-serif text-base font-bold text-charcoal">
                      {scenario.title}
                    </h3>
                    <p className="mt-1 text-xs text-mutedtext">{scenario.description}</p>
                  </div>
                  <ArrowRight className="ml-3 h-4 w-4 shrink-0 text-mutedtext transition-transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'scenario' && activeScenario && (
          <ScenarioView
            scenario={activeScenario}
            onBack={() => setView('list')}
          />
        )}

        {view === 'quiz' && activeScenario && (
          <QuizView
            scenario={activeScenario}
            onBack={() => setView('list')}
          />
        )}
      </div>
    </AppShell>
  );
}

function ScenarioView({ scenario, onBack }: { scenario: LearningScenario; onBack: () => void }) {
  const [messages, setMessages] = useState<{ role: 'her' | 'coach'; text: string }[]>([
    { role: 'her', text: 'nice' },
    {
      role: 'coach',
      text: 'She gave you a one-word response. That\'s not a dead end — it\'s a test. She wants to see if you\'ll carry the conversation or let it die. Try one of the approaches below.',
    },
  ]);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const options = [
    {
      text: 'Nice? That\'s all I get? I poured my heart into that opener.',
      feedback: 'Too much pressure — you\'re making her feel bad for a short response. This will make her pull away.',
      good: false,
    },
    {
      text: 'Okay so you\'re a person of few words. I respect that. What\'s something you\'re NOT few words about?',
      feedback: 'Strong — you acknowledged the short response without being weird about it, then redirected to something specific. This works.',
      good: true,
    },
    {
      text: 'So what do you do for fun?',
      feedback: 'Too generic — you ignored the awkwardness and went straight to an interview question. It\'ll feel like a form.',
      good: false,
    },
  ];

  const handleSelect = (idx: number) => {
    setSelected(idx);
    setFeedback(options[idx].feedback);
  };

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1 text-sm text-mutedtext transition-colors hover:text-charcoal"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to learning
      </button>

      <div className="mb-6">
        <span className="rounded-full bg-coral/15 px-2.5 py-1 font-mono text-xs text-coral">
          Practice
        </span>
        <h1 className="mt-3 font-serif text-2xl font-bold text-charcoal">{scenario.title}</h1>
      </div>

      {/* Chat-style interface */}
      <div className="space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'her' ? 'flex justify-start' : 'flex justify-start pl-2'}>
            {msg.role === 'her' ? (
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-charcoal shadow-sm">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[85%] rounded-lg border-l-2 border-coral bg-beige-50 px-3 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-coral">Coach</span>
                <p className="mt-1 text-xs leading-relaxed text-charcoal">{msg.text}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Options */}
      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold text-charcoal">Pick your response:</p>
        <div className="space-y-2">
          {options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={cn(
                'w-full rounded-xl border p-4 text-left text-sm transition-all',
                selected === idx
                  ? option.good
                    ? 'border-sage bg-sage/10'
                    : 'border-destructive bg-destructive/5'
                  : 'border-beige-200 bg-white hover:border-beige-300'
              )}
            >
              <p className={selected === idx ? 'text-charcoal' : 'text-mutedtext'}>
                {option.text}
              </p>
              {selected === idx && (
                <div className="mt-2 flex items-center gap-1.5">
                  {option.good ? (
                    <Check className="h-3.5 w-3.5 text-sage" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className={cn('text-xs', option.good ? 'text-sage-dark' : 'text-destructive')}>
                    {option.good ? 'This works' : 'Try again'}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {feedback && (
          <div className="mt-4 rounded-xl border-l-2 border-coral bg-beige-50 p-4 animate-fade-in-up">
            <span className="font-mono text-[10px] uppercase tracking-wider text-coral">Coach feedback</span>
            <p className="mt-1 text-sm leading-relaxed text-charcoal">{feedback}</p>
            <button
              onClick={() => { setSelected(null); setFeedback(null); }}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-coral hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              Try another approach
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizView({ scenario, onBack }: { scenario: LearningScenario; onBack: () => void }) {
  const questions = [
    {
      opener: 'Hey! Love your hiking photos — where was that?',
      options: [
        { text: 'She\'s just being polite', correct: false, feedback: 'No — she asked a specific question about your photos. That\'s active interest, not politeness.' },
        { text: 'She looked at your profile carefully', correct: true, feedback: 'Yes — she noticed a specific detail and asked about it. That\'s a strong engagement signal.' },
        { text: 'She\'s testing you', correct: false, feedback: 'Not everything is a test. Sometimes people just want to know more about you.' },
      ],
    },
    {
      opener: 'What do you do for fun? Besides winning pizza debates obviously',
      options: [
        { text: 'She\'s making fun of you', correct: false, feedback: 'No — she\'s referencing your earlier conversation. That\'s a callback, which means she was paying attention.' },
        { text: 'She remembers what you said', correct: true, feedback: 'Exactly — the callback shows she\'s invested in the conversation. This is a good sign.' },
        { text: 'She\'s bored', correct: false, feedback: 'A bored person doesn\'t add a joke. She\'s engaged and trying to keep it light.' },
      ],
    },
  ];

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);

  const handleSelect = (idx: number) => {
    setSelected(idx);
    setShowFeedback(true);
    if (questions[currentQ].options[idx].correct) {
      setScore(score + 1);
    }
  };

  const next = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setShowFeedback(false);
    } else {
      onBack();
    }
  };

  const q = questions[currentQ];

  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1 text-sm text-mutedtext transition-colors hover:text-charcoal"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to learning
      </button>

      <div className="mb-6">
        <span className="rounded-full bg-sage/15 px-2.5 py-1 font-mono text-xs text-sage-dark">
          Quiz
        </span>
        <h1 className="mt-3 font-serif text-2xl font-bold text-charcoal">{scenario.title}</h1>
        <p className="mt-2 font-mono text-xs text-mutedtext">
          Question {currentQ + 1} of {questions.length} · Score: {score}
        </p>
      </div>

      {/* The opener */}
      <div className="mb-6 rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-charcoal shadow-sm">
        {q.opener}
      </div>

      <p className="mb-3 text-sm font-semibold text-charcoal">What does this signal?</p>
      <div className="space-y-2">
        {q.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => !showFeedback && handleSelect(idx)}
            disabled={showFeedback}
            className={cn(
              'w-full rounded-xl border p-4 text-left text-sm transition-all',
              showFeedback && idx === selected
                ? option.correct
                  ? 'border-sage bg-sage/10'
                  : 'border-destructive bg-destructive/5'
                : showFeedback && option.correct
                  ? 'border-sage bg-sage/5'
                  : 'border-beige-200 bg-white hover:border-beige-300',
              showFeedback && 'cursor-default'
            )}
          >
            <p className="text-charcoal">{option.text}</p>
            {showFeedback && (idx === selected || option.correct) && (
              <p className="mt-2 text-xs text-mutedtext">{option.feedback}</p>
            )}
          </button>
        ))}
      </div>

      {showFeedback && (
        <button
          onClick={next}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-coral px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-coral-dark"
        >
          {currentQ < questions.length - 1 ? 'Next question' : 'Finish'}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
