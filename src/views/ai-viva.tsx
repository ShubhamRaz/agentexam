'use client'

/* ============================================================
   AgentExam — AI Viva view (intro → active chat → evaluation)
   Ported from the original React AIViva.jsx: the AI examiner
   asks up to 5 oral questions, each typed answer is graded in
   real time (3–15s) with instant feedback, and the session ends
   with a full evaluation report.
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  Loader2,
  Mic,
  RotateCcw,
  Send,
  Sparkles,
  TrendingUp,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  AIBadge,
  AICard,
  EmptyState,
  ErrorCard,
  LoadingCard,
  ProgressCircle,
  SectionCard,
  ViewHeader,
} from '@/components/app/bits'
import { api } from '@/lib/api-client'
import { getScoreBarColor, truncate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { Subject, VivaEvaluation, VivaStartResponse } from '@/lib/types'

/* ---------- local types ---------- */

type Phase = 'intro' | 'active' | 'evaluation'

interface VivaMessage {
  id: string
  role: 'ai' | 'user'
  text: string
  evaluation?: { marks: number; maxMarks: number }
}

interface AnswerScore {
  question: string
  marks: number
  maxMarks: number
}

interface VivaSummary {
  percentage: number
  obtained: number
  total: number
  analytics: { improvement_suggestions: string }
}

const HOW_IT_WORKS = [
  'The AI examiner asks a series of questions from your chosen subject',
  'You type your answer, just as you would speak it in a real viva',
  'Every answer is scored instantly with examiner-style feedback',
]

/* ============================================================
   Main view
   ============================================================ */

export function AIVivaView() {
  const [phase, setPhase] = useState<Phase>('intro')

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [subjectsError, setSubjectsError] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState('')

  const [session, setSession] = useState<VivaStartResponse | null>(null)
  const [messages, setMessages] = useState<VivaMessage[]>([])
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [currentQ, setCurrentQ] = useState(-1)
  const [vivaDone, setVivaDone] = useState(false)
  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)
  const [scores, setScores] = useState<AnswerScore[]>([])
  const [summary, setSummary] = useState<VivaSummary | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])

  const subjectName = subjects.find(s => s.id === subjectId)?.name

  /* ---------- data loading ---------- */

  const loadSubjects = useCallback(() => {
    setSubjectsLoading(true)
    setSubjectsError(null)
    api
      .get<Subject[]>('/subjects')
      .then(data => setSubjects(data || []))
      .catch(err => setSubjectsError(err instanceof Error ? err.message : 'Failed to load subjects'))
      .finally(() => setSubjectsLoading(false))
  }, [])

  useEffect(() => {
    loadSubjects()
  }, [loadSubjects])

  /* auto-scroll to the newest message */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, waiting])

  /* clear pending question timers on unmount */
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => window.clearTimeout(t))
    }
  }, [])

  /* ---------- session flow ---------- */

  const startViva = useCallback(async () => {
    if (!subjectId || starting) return
    setStarting(true)
    try {
      const res = await api.post<VivaStartResponse>('/viva/start', { subject_id: subjectId })
      if (!res.questions || res.questions.length === 0) {
        toast.error('No viva questions available for this subject yet.')
        return
      }
      setSession(res)
      setMessages([
        {
          id: 'welcome',
          role: 'ai',
          text: `Welcome to your ${subjectName ?? 'subject'} viva. I'll ask ${res.questions.length} questions — answer as you would orally.`,
        },
      ])
      setScores([])
      setSummary(null)
      setCurrentQ(-1)
      setVivaDone(false)
      setInput('')
      setPhase('active')

      timersRef.current.push(
        window.setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { id: 'q-0', role: 'ai', text: `Question 1: ${res.questions[0].question_text}` },
          ])
          setCurrentQ(0)
        }, 1000)
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start the viva session.')
    } finally {
      setStarting(false)
    }
  }, [subjectId, starting, subjectName])

  const resetInputHeight = () => {
    const el = inputRef.current
    if (el) el.style.height = 'auto'
  }

  const sendAnswer = useCallback(async () => {
    const text = input.trim()
    if (!text || !session || waiting || vivaDone || currentQ < 0) return
    const question = session.questions[currentQ]
    if (!question) return

    setMessages(prev => [...prev, { id: `u-${question.id}`, role: 'user', text }])
    setInput('')
    resetInputHeight()
    setWaiting(true)

    try {
      const evaluation = await api.put<VivaEvaluation>(`/viva/${session.id}/answers/${question.id}`, {
        answer_text: text,
      })
      setMessages(prev => [
        ...prev,
        {
          id: `e-${question.id}`,
          role: 'ai',
          text: evaluation.feedback,
          evaluation: { marks: evaluation.marks_obtained, maxMarks: evaluation.max_marks },
        },
      ])
      setScores(prev => [
        ...prev,
        { question: question.question_text, marks: evaluation.marks_obtained, maxMarks: evaluation.max_marks },
      ])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to evaluate your answer.')
      setWaiting(false)
      return
    }

    /* next question — or close the session. waiting stays up through the
       pause so the input is locked while the examiner "speaks". */
    const next = currentQ + 1
    if (next < session.questions.length) {
      timersRef.current.push(
        window.setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { id: `q-${next}`, role: 'ai', text: `Question ${next + 1}: ${session.questions[next].question_text}` },
          ])
          setCurrentQ(next)
          setWaiting(false)
        }, 1200)
      )
    } else {
      timersRef.current.push(
        window.setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: 'closing',
              role: 'ai',
              text: 'That concludes our session. Click "End & Evaluate" to see your results.',
            },
          ])
          setVivaDone(true)
          setWaiting(false)
        }, 1200)
      )
    }
  }, [input, session, waiting, vivaDone, currentQ])

  const endViva = useCallback(async () => {
    if (!session || ending) return
    setEnding(true)
    try {
      const res = await api.post<VivaSummary>(`/viva/${session.id}/submit`)
      setSummary(res)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch the final evaluation.')
    } finally {
      setEnding(false)
      setPhase('evaluation')
    }
  }, [session, ending])

  const resetViva = () => {
    timersRef.current.forEach(t => window.clearTimeout(t))
    timersRef.current = []
    setSession(null)
    setMessages([])
    setScores([])
    setSummary(null)
    setCurrentQ(-1)
    setVivaDone(false)
    setInput('')
    setWaiting(false)
    setEnding(false)
    setPhase('intro')
  }

  /* ---------- intro phase ---------- */
  if (phase === 'intro') {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="AI Viva" subtitle="Oral exam simulation with instant AI scoring" />
        {subjectsError ? (
          <ErrorCard message={subjectsError} onRetry={loadSubjects} />
        ) : subjectsLoading ? (
          <LoadingCard label="Loading subjects…" />
        ) : (
          <Card className="mx-auto w-full max-w-xl shadow-xs">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center">
                <div className="ai-glow mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                  <Mic className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">AI Viva Voce</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Practice oral questions with an AI examiner and get scored on every answer.
                </p>
                <div className="mt-3">
                  <AIBadge label="AI Examiner" />
                </div>
              </div>

              <div className="mt-8 space-y-2">
                <Label htmlFor="viva-subject">Subject *</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger id="viva-subject" className="w-full">
                    <SelectValue placeholder="Choose a subject…" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="mt-6 h-11 w-full bg-violet-600 text-sm font-semibold hover:bg-violet-700"
                disabled={!subjectId || starting}
                onClick={() => void startViva()}
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {starting ? 'Starting session…' : 'Start Viva Session'}
              </Button>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">How it works</p>
                <ol className="mt-3 space-y-2.5">
                  {HOW_IT_WORKS.map((step, i) => (
                    <li key={step} className="flex items-start gap-3 text-sm leading-relaxed text-slate-600">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  /* ---------- active viva chat ---------- */
  if (phase === 'active' && session) {
    const total = session.questions.length
    const answered = scores.length
    const currentNumber = vivaDone ? total : Math.max(1, Math.min(currentQ + 1, total))

    return (
      <div className="animate-fade-in-up space-y-6">
        <div className="mx-auto flex h-[calc(100dvh-10rem)] min-h-[460px] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          {/* chat header */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{subjectName ?? 'AI Viva'} — Viva</p>
                <p className="text-xs text-slate-500">
                  Question {currentNumber} of {total}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={(answered / total) * 100} className="hidden h-1.5 w-24 sm:block" />
              <Button
                size="sm"
                variant={vivaDone ? 'default' : 'ghost'}
                onClick={() => void endViva()}
                disabled={ending}
                className={cn(
                  vivaDone
                    ? 'bg-violet-600 font-semibold text-white hover:bg-violet-700 ai-glow'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {ending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                End &amp; Evaluate
              </Button>
            </div>
          </div>

          {/* messages */}
          <div className="ae-scroll flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
            {messages.map(msg => (
              <VivaBubble key={msg.id} msg={msg} />
            ))}
            {waiting && (
              <div className="flex items-end gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3.5">
                  <span className="typing-dot h-2 w-2 rounded-full bg-violet-500" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-violet-500" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-violet-500" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* input area */}
          <div className="border-t border-slate-100 bg-white px-3 py-3 sm:px-4">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  const el = e.target
                  el.style.height = 'auto'
                  el.style.height = `${Math.min(el.scrollHeight, 144)}px`
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendAnswer()
                  }
                }}
                placeholder={
                  vivaDone
                    ? 'The session has ended — click End & Evaluate to see your results'
                    : 'Type your answer… (Enter to send, Shift+Enter for a new line)'
                }
                disabled={waiting || vivaDone}
                className="max-h-36 min-h-[2.75rem] resize-none overflow-hidden"
              />
              <Button
                size="icon"
                aria-label="Send answer"
                className="h-11 w-11 shrink-0 bg-violet-600 hover:bg-violet-700"
                disabled={!input.trim() || waiting || vivaDone}
                onClick={() => void sendAnswer()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- evaluation phase ---------- */
  const totalMarks = scores.reduce((sum, s) => sum + s.maxMarks, 0)
  const obtained = scores.reduce((sum, s) => sum + s.marks, 0)
  const overall = totalMarks > 0 ? Math.round((obtained / totalMarks) * 100) : 0
  const strong = scores.filter(s => s.maxMarks > 0 && s.marks / s.maxMarks >= 0.7)
  const improve = scores.filter(s => s.maxMarks === 0 || s.marks / s.maxMarks < 0.7)

  return (
    <div className="animate-fade-in-up space-y-6">
      <ViewHeader title="Viva Evaluation" subtitle={`${subjectName ?? 'Viva'} — session summary`} />

      {scores.length === 0 ? (
        <EmptyState
          icon={Mic}
          title="No answers recorded"
          message="You ended the viva before answering any questions. Take another viva to practice."
        />
      ) : (
        <>
          {/* overall score */}
          <Card className="shadow-xs">
            <CardContent className="p-6 text-center sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">Viva Completed! 🎉</h2>
              <p className="mt-1 text-sm text-slate-500">
                You answered {scores.length} question{scores.length === 1 ? '' : 's'}
                {summary ? ` — ${summary.obtained}/${summary.total} marks` : ''}
              </p>
              <div className="mt-6 flex justify-center">
                <ProgressCircle value={overall} size={140} strokeWidth={10} />
              </div>
            </CardContent>
          </Card>

          {/* strong vs improve */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">✅ Strong Answers ({strong.length})</h3>
              </div>
              <CardContent className="p-5">
                {strong.length === 0 ? (
                  <p className="text-sm text-slate-400">Keep practicing to build strong answers.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {strong.map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5 py-2.5 text-sm first:pt-0 last:pb-0">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="flex-1 leading-relaxed text-slate-600">{truncate(s.question, 90)}</span>
                        <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-600">
                          {s.marks}/{s.maxMarks}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">📈 Areas to Improve ({improve.length})</h3>
              </div>
              <CardContent className="p-5">
                {improve.length === 0 ? (
                  <p className="text-sm text-slate-400">Excellent! All your answers were strong.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {improve.map((s, i) => (
                      <div key={i} className="flex items-start gap-2.5 py-2.5 text-sm first:pt-0 last:pb-0">
                        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <span className="flex-1 leading-relaxed text-slate-600">{truncate(s.question, 90)}</span>
                        <span className="shrink-0 text-xs font-bold tabular-nums text-amber-600">
                          {s.marks}/{s.maxMarks}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* per-question scores */}
          <SectionCard title="Question Scores" contentClassName="space-y-4">
            {scores.map((s, i) => {
              const ratio = s.maxMarks > 0 ? (s.marks / s.maxMarks) * 100 : 0
              return (
                <div key={i}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-sm leading-relaxed text-slate-600">
                      <span className="font-semibold text-slate-400">Q{i + 1}:</span> {truncate(s.question, 70)}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700">
                      {s.marks}/{s.maxMarks}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full transition-all', getScoreBarColor(ratio))}
                      style={{ width: `${Math.max(0, Math.min(100, ratio))}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </SectionCard>
        </>
      )}

      {/* AI improvement suggestions */}
      {summary?.analytics?.improvement_suggestions && (
        <AICard title="Improvement Suggestions" icon={Sparkles}>
          <p className="whitespace-pre-line">{summary.analytics.improvement_suggestions}</p>
        </AICard>
      )}

      <div className="flex justify-center">
        <Button className="bg-violet-600 hover:bg-violet-700" onClick={resetViva}>
          <RotateCcw className="h-4 w-4" /> Take Another Viva
        </Button>
      </div>
    </div>
  )
}

/* ---------- chat bubble ---------- */

function VivaBubble({ msg }: { msg: VivaMessage }) {
  if (msg.role === 'user') {
    return (
      <div className="flex items-end justify-end gap-2.5">
        <div className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-tr-sm bg-violet-600 px-4 py-3 text-sm leading-relaxed text-white shadow-xs">
          {msg.text}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <User className="h-4 w-4" />
        </div>
      </div>
    )
  }

  const ratio = msg.evaluation && msg.evaluation.maxMarks > 0 ? msg.evaluation.marks / msg.evaluation.maxMarks : 0

  return (
    <div className="flex items-end gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
        <Bot className="h-4 w-4" />
      </div>
      <div className="max-w-[85%]">
        <div className="whitespace-pre-line rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700">
          {msg.text}
        </div>
        {msg.evaluation && (
          <div className="mt-1.5 flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'font-bold tabular-nums',
                ratio >= 0.7
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              )}
            >
              {msg.evaluation.marks}/{msg.evaluation.maxMarks}
            </Badge>
            <span className="text-[11px] font-medium text-slate-400">examiner score</span>
          </div>
        )}
      </div>
    </div>
  )
}
