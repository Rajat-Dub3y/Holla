'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { AppShell } from '@/components/app-shell';
import { CreditPill } from '@/components/credit-pill';
import { BRAND } from '@/lib/brand';
import { ApiError, apiFetch } from '@/lib/api-client';
import { mockLearningScenarios } from '@/lib/mock-data';
import { useMe } from '@/lib/use-me';
import type { LearningScenario } from '@/lib/types';
import { cn } from '@/lib/utils';

type View = 'list' | 'practice' | 'quiz' | 'qna';
type PracticeMessage = { sender: 'user' | 'match'; content: string };
type QuizScenario = { id: string; herMessage: string; options: { id: string; text: string }[] };

export function LearnWorkspace() {
  const { profile } = useMe();
  const { mutate } = useSWRConfig();
  const [view, setView] = useState<View>('list');
  const [scenario, setScenario] = useState<LearningScenario | null>(null);
  const [conversationSoFar, setConversationSoFar] = useState<PracticeMessage[]>([]);
  const [practiceText, setPracticeText] = useState('');
  const [practiceFeedback, setPracticeFeedback] = useState('');
  const [qnaMessages, setQnaMessages] = useState<{ role: 'user' | 'coach'; text: string }[]>([]);
  const [qnaText, setQnaText] = useState('');
  const [quiz, setQuiz] = useState<QuizScenario | null>(null);
  const [quizResult, setQuizResult] = useState<{ correct: boolean; correctOptionId: string; explanation: string } | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resetAt, setResetAt] = useState<string | null>(null);

  const backToList = () => {
    setView('list');
    setScenario(null);
    setResetAt(null);
  };

  const handleError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 402 && error.body.error === 'no_credits') {
      setResetAt(typeof error.body.dailyResetAt === 'string' ? error.body.dailyResetAt : profile?.dailyResetAt ?? null);
    } else toast.error('Could not complete that learning session. Please try again.');
  };

  const refreshCredits = async () => mutate('/api/user/me');

  const fetchQuiz = async () => {
    setLoading(true);
    setQuizResult(null);
    try {
      const nextQuiz = await apiFetch<QuizScenario>('/api/learning/quiz');
      setQuiz(nextQuiz);
      setView('quiz');
      await refreshCredits();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const openScenario = async (nextScenario: LearningScenario) => {
    setScenario(nextScenario);
    setResetAt(null);
    if (nextScenario.type === 'quiz') {
      await fetchQuiz();
    } else if (nextScenario.type === 'practice') {
      setConversationSoFar([{ sender: 'match', content: nextScenario.openingMessage ?? 'nice' }]);
      setPracticeFeedback('');
      setPracticeText('');
      setView('practice');
    } else {
      setQnaMessages([]);
      setQnaText('');
      setView('qna');
    }
  };

  const sendPractice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!scenario || !practiceText.trim()) return;
    setLoading(true);
    const hisNewMessage = practiceText.trim();
    try {
      const result = await apiFetch<{ herReply: string; coachFeedback: string }>('/api/learning/practice', {
        method: 'POST',
        body: JSON.stringify({
          personaDescription: scenario.personaDescription ?? 'She texts warmly and responds to specific, low-pressure questions.',
          conversationSoFar,
          hisNewMessage,
        }),
      });
      setConversationSoFar((current) => [...current, { sender: 'user', content: hisNewMessage }, { sender: 'match', content: result.herReply }]);
      setPracticeFeedback(result.coachFeedback);
      setPracticeText('');
      await refreshCredits();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const sendQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!qnaText.trim()) return;
    setLoading(true);
    const question = qnaText.trim();
    try {
      const result = await apiFetch<{ answer: string }>('/api/learning/qna', { method: 'POST', body: JSON.stringify({ question }) });
      setQnaMessages((current) => [...current, { role: 'user', text: question }, { role: 'coach', text: result.answer }]);
      setQnaText('');
      await refreshCredits();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const answerQuiz = async (selectedOptionId: string) => {
    if (!quiz || quizResult) return;
    setLoading(true);
    try {
      const result = await apiFetch<{ correct: boolean; correctOptionId: string; explanation: string }>('/api/learning/quiz', {
        method: 'POST',
        body: JSON.stringify({ scenarioId: quiz.id, selectedOptionId }),
      });
      setQuizResult(result);
      if (result.correct) setScore((current) => current + 1);
      await refreshCredits();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return <AppShell>
    <div className="mx-auto max-w-4xl px-6 py-6 md:px-8 md:py-10">
      <div className="mb-6 flex items-center justify-between md:hidden"><span className="font-serif text-xl font-bold text-charcoal">{BRAND.name}</span><CreditPill credits={profile?.credits ?? 0} /></div>
      {view === 'list' && <div className="animate-fade-in"><div className="mb-6"><p className="font-mono text-xs uppercase tracking-widest text-coral">Learning</p><h1 className="mt-1 font-serif text-3xl font-bold text-charcoal md:text-4xl">Get better between conversations</h1><p className="mt-2 text-sm text-mutedtext">Practice scenarios, quick quizzes, and straight answers — built around your vibe.</p></div><div className="space-y-3">{mockLearningScenarios.map((item) => <button key={item.id} onClick={() => openScenario(item)} disabled={loading} className="group flex w-full items-center justify-between rounded-xl border border-beige-200 bg-white p-4 text-left transition-all hover:border-beige-300 hover:shadow-sm"><div className="flex-1"><div className="mb-1 flex items-center gap-2"><span className={cn('rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider', item.type === 'practice' ? 'bg-coral/15 text-coral' : item.type === 'quiz' ? 'bg-sage/15 text-sage-dark' : 'bg-beige-200 text-beige-800')}>{item.type === 'practice' ? 'Practice' : item.type === 'quiz' ? 'Quiz' : 'Q&A'}</span><span className="font-mono text-[10px] text-mutedtext">{item.difficulty}</span></div><h3 className="font-serif text-base font-bold text-charcoal">{item.title}</h3><p className="mt-1 text-xs text-mutedtext">{item.description}</p></div><ArrowRight className="ml-3 h-4 w-4 shrink-0 text-mutedtext transition-transform group-hover:translate-x-1" /></button>)}</div></div>}

      {view !== 'list' && <div className="animate-fade-in">
        <button onClick={backToList} className="mb-6 inline-flex items-center gap-1 text-sm text-mutedtext transition-colors hover:text-charcoal"><ArrowLeft className="h-4 w-4" />Back to learning</button>
        <div className="mb-6"><span className={cn('rounded-full px-2.5 py-1 font-mono text-xs', view === 'quiz' ? 'bg-sage/15 text-sage-dark' : 'bg-coral/15 text-coral')}>{view === 'quiz' ? 'Quiz' : view === 'qna' ? 'Q&A' : 'Practice'}</span><h1 className="mt-3 font-serif text-2xl font-bold text-charcoal">{view === 'qna' ? 'Ask the coach' : scenario?.title}</h1>{view === 'quiz' && <p className="mt-2 font-mono text-xs text-mutedtext">Score: {score}</p>}</div>

        {view === 'practice' && <>
          <div className="space-y-3">{conversationSoFar.map((message, index) => <div key={`${index}-${message.sender}`} className={message.sender === 'match' ? 'flex justify-start' : 'flex justify-end'}><div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm text-charcoal shadow-sm', message.sender === 'match' ? 'rounded-tl-sm bg-white' : 'rounded-tr-sm bg-beige-400')}>{message.content}</div></div>)}{practiceFeedback && <div className="flex justify-start pl-2"><div className="max-w-[85%] rounded-lg border-l-2 border-coral bg-beige-50 px-3 py-2.5"><span className="font-mono text-[10px] uppercase tracking-wider text-coral">Coach feedback</span><p className="mt-1 text-xs leading-relaxed text-charcoal">{practiceFeedback}</p></div></div>}</div>
          {!resetAt ? <form onSubmit={sendPractice} className="mt-5"><textarea value={practiceText} onChange={(event) => setPracticeText(event.target.value)} rows={3} placeholder="Write your reply..." className="w-full resize-y rounded-xl border border-beige-300 bg-white px-4 py-3 text-sm text-charcoal outline-none focus:border-coral" /><button disabled={loading || !practiceText.trim()} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50">{loading ? 'Sending...' : 'Send'}<Send className="h-4 w-4" /></button></form> : <OutOfPractice resetAt={resetAt} />}
        </>}

        {view === 'qna' && <><div className="space-y-3">{qnaMessages.map((message, index) => <div key={`${index}-${message.role}`} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start pl-2'}><div className={cn('max-w-[85%] rounded-xl px-4 py-3 text-sm', message.role === 'user' ? 'bg-beige-400 text-charcoal' : 'border-l-2 border-coral bg-beige-50 text-charcoal')}>{message.text}</div></div>)}{!qnaMessages.length && <p className="rounded-xl border border-beige-200 bg-white p-4 text-sm text-mutedtext">What would you like to work through?</p>}</div>{!resetAt ? <form onSubmit={sendQuestion} className="mt-5 flex gap-2"><input value={qnaText} onChange={(event) => setQnaText(event.target.value)} placeholder="Ask a question..." className="min-w-0 flex-1 rounded-xl border border-beige-300 bg-white px-4 py-3 text-sm outline-none focus:border-coral" /><button disabled={loading || !qnaText.trim()} aria-label="Send question" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral text-cream disabled:opacity-50"><Send className="h-4 w-4" /></button></form> : <OutOfPractice resetAt={resetAt} />}</>}

        {view === 'quiz' && <>{loading && !quiz ? <div className="h-24 animate-pulse rounded-xl bg-beige-100" /> : quiz ? <><div className="mb-6 rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-charcoal shadow-sm">{quiz.herMessage}</div><p className="mb-3 text-sm font-semibold text-charcoal">Which reply keeps things going?</p><div className="space-y-2">{quiz.options.map((option) => <button key={option.id} onClick={() => answerQuiz(option.id)} disabled={loading || !!quizResult} className={cn('w-full rounded-xl border p-4 text-left text-sm transition-all', quizResult?.correctOptionId === option.id ? 'border-sage bg-sage/10' : 'border-beige-200 bg-white hover:border-beige-300', (loading || quizResult) && 'cursor-default')}><p className="text-charcoal">{option.text}</p></button>)}</div>{quizResult && <div className="mt-4 rounded-xl border-l-2 border-coral bg-beige-50 p-4"><div className="flex items-center gap-1.5">{quizResult.correct ? <Check className="h-4 w-4 text-sage" /> : <RotateCcw className="h-4 w-4 text-coral" />}<span className="font-mono text-[10px] uppercase tracking-wider text-coral">{quizResult.correct ? 'That works' : 'Try this direction'}</span></div><p className="mt-2 text-sm leading-relaxed text-charcoal">{quizResult.explanation}</p><button onClick={fetchQuiz} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50">Next question<ArrowRight className="h-4 w-4" /></button></div>}</> : <button onClick={fetchQuiz} className="rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-cream">Load a question</button>}</>}
      </div>}
    </div>
  </AppShell>;
}

function OutOfPractice({ resetAt }: { resetAt: string | null }) {
  const reset = resetAt ? `Resets in ${formatDistanceToNow(new Date(resetAt))}` : 'Your practice credits reset soon';
  return <div className="mt-5 rounded-xl border border-beige-300 bg-beige-50 p-4 text-sm text-charcoal">You&apos;re out of practice for today. {reset}.</div>;
}
