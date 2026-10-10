'use client'

/* ============================================================
   AgentExam — Theory Exam view (setup → exam → results machine)
   Ported from the original React TheoryExam.jsx onto the new
   stack: shadcn/ui, autosave-to-backend, live countdown, and a
   full-screen AI evaluation overlay while answers are graded.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { AICard, ErrorCard, LoadingCard, ProgressCircle, ViewHeader } from '@/components/app/bits'
import { api } from '@/lib/api-client'
import { formatClock, questionTypeLabel } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type {
  ExamQuestion,
  ExamResult,
  ExamStartResponse,
  QuestionType,
  Subject,
  ViewId,
} from '@/lib/types'

/* ---------- shared constants ---------- */

type Phase = 'setup' | 'exam' | 'results'

interface ExamConfig {
  subjectId: string
  subjectName: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'
  questionCount: number
  durationMinutes: number
}

const DIFFICULTIES: { value: ExamConfig['difficulty']; label: string }[] = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
  { value: 'MIXED', label: 'Mixed' },
]

const QUESTION_COUNTS = [5, 10, 15, 20]
const DURATIONS = [15, 30, 45, 60]

const TYPE_BADGE: Record<QuestionType, string> = {
  MCQ: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  SHORT_ANSWER: 'border-amber-200 bg-amber-50 text-amber-700',
  LONG_ANSWER: 'border-violet-200 bg-violet-50 text-violet-700',
}

const EVAL_STEPS = [
  'Grading objective answers',
  'Evaluating written answers',
  'Generating improvement suggestions',
]

const DEBOUNCE_MS = 800

/* ============================================================
   Main view
   ============================================================ */

export function TheoryExamView({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [subjectsError, setSubjectsError] = useState<string | null>(null)

  const [config, setConfig] = useState<ExamConfig | null>(null)
  const [exam, setExam] = useState<ExamStartResponse | null>(null)
  const [totalMarks, setTotalMarks] = useState(0)
  const [result, setResult] = useState<ExamResult | null>(null)
  const [creating, setCreating] = useState(false)

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

  /* create + start the exam, then move to the exam phase */
  const handleStart = useCallback(async (cfg: ExamConfig) => {
    setCreating(true)
    try {
      const created = await api.post<{ id: string; total_marks: number; question_count: number }>(
        '/exams',
        {
          subject_id: cfg.subjectId,
          difficulty: cfg.difficulty,
          question_count: cfg.questionCount,
          duration_minutes: cfg.durationMinutes,
        }
      )
      const started = await api.post<ExamStartResponse>(`/exams/${created.id}/start`)
      setConfig(cfg)
      setExam(started)
      setTotalMarks(created.total_marks)
      setPhase('exam')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start the exam. Please try again.')
    } finally {
      setCreating(false)
    }
  }, [])

  const handleExamFinished = useCallback((res: ExamResult) => {
    setResult(res)
    setPhase('results')
  }, [])

  const restart = useCallback(() => {
    setResult(null)
    setExam(null)
    setTotalMarks(0)
    setPhase('setup')
  }, [])

  /* ---------- exam phase ---------- */
  if (phase === 'exam' && exam && config) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ActiveExam exam={exam} config={config} totalMarks={totalMarks} onFinished={handleExamFinished} />
      </div>
    )
  }

  /* ---------- results phase ---------- */
  if (phase === 'results' && result && config) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Exam Results" subtitle={`${config.subjectName} — AI-evaluated mock test`} />
        <ExamResults
          result={result}
          questions={exam?.questions ?? []}
          onRestart={restart}
          onPerformance={() => onNavigate('performance')}
        />
      </div>
    )
  }

  /* ---------- setup phase (default) ---------- */
  return (
    <div className="animate-fade-in-up space-y-6">
      <ViewHeader
        title="Theory Exam"
        subtitle="AI-graded mock tests — objective answers scored instantly, written answers evaluated by your AI examiner"
      />
      {subjectsError ? (
        <ErrorCard message={subjectsError} onRetry={loadSubjects} />
      ) : (
        <ExamSetup
          subjects={subjects}
          subjectsLoading={subjectsLoading}
          creating={creating}
          onStart={handleStart}
        />
      )}
    </div>
  )
}

/* ============================================================
   Phase 1 — setup card
   ============================================================ */

function ExamSetup({
  subjects,
  subjectsLoading,
  creating,
  onStart,
}: {
  subjects: Subject[]
  subjectsLoading: boolean
  creating: boolean
  onStart: (config: ExamConfig) => void
}) {
  const [subjectId, setSubjectId] = useState('')
  const [difficulty, setDifficulty] = useState<ExamConfig['difficulty']>('MEDIUM')
  const [questionCount, setQuestionCount] = useState(10)
  const [duration, setDuration] = useState(30)

  const canStart = !!subjectId && !creating && !subjectsLoading

  return (
    <Card className="mx-auto w-full max-w-xl shadow-xs">
      <CardContent className="p-6 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <BookOpen className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Start Theory Exam</h2>
          <p className="mt-1 text-sm text-slate-500">Configure your practice test and face the AI examiner.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="exam-subject">Subject *</Label>
            <Select value={subjectId} onValueChange={setSubjectId} disabled={subjectsLoading}>
              <SelectTrigger id="exam-subject" className="w-full">
                <SelectValue placeholder={subjectsLoading ? 'Loading subjects…' : 'Choose a subject'} />
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

          <div className="space-y-2">
            <Label htmlFor="exam-difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={v => setDifficulty(v as ExamConfig['difficulty'])}>
              <SelectTrigger id="exam-difficulty" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map(d => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exam-count">Number of Questions</Label>
            <Select value={String(questionCount)} onValueChange={v => setQuestionCount(Number(v))}>
              <SelectTrigger id="exam-count" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_COUNTS.map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n} Questions
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exam-duration">Duration</Label>
            <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
              <SelectTrigger id="exam-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map(m => (
                  <SelectItem key={m} value={String(m)}>
                    {m} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          A paper of {questionCount} questions will be generated — total marks shown once it&apos;s created.
        </p>

        <Button
          className="mt-5 h-11 w-full bg-violet-600 text-sm font-semibold hover:bg-violet-700"
          disabled={!canStart}
          onClick={() =>
            onStart({
              subjectId,
              subjectName: subjects.find(s => s.id === subjectId)?.name ?? 'Exam',
              difficulty,
              questionCount,
              durationMinutes: duration,
            })
          }
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {creating ? 'Creating your exam…' : 'Start Exam'}
        </Button>
      </CardContent>
    </Card>
  )
}

/* ============================================================
   Phase 2 — active exam
   ============================================================ */

function ActiveExam({
  exam,
  config,
  totalMarks,
  onFinished,
}: {
  exam: ExamStartResponse
  config: ExamConfig
  totalMarks: number
  onFinished: (result: ExamResult) => void
}) {
  const questions = exam.questions

  /* answers: questionId → selected option id (MCQ) or answer text */
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const saved of exam.saved_answers) {
      const value = saved.selected_option_id ?? saved.answer_text ?? ''
      if (value) initial[saved.question_id] = value
    }
    return initial
  })
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [current, setCurrent] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(config.durationMinutes * 60)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [evalStep, setEvalStep] = useState(0)

  /* refs to dodge stale closures in timers + submit guard */
  const submittingRef = useRef(false)
  const timeUpRef = useRef(false)
  const pendingRef = useRef<{ qid: string; text: string } | null>(null)
  const debounceRef = useRef<number | null>(null)
  const stepTimersRef = useRef<number[]>([])
  const submitRef = useRef<() => void>(() => {})

  const question = questions[current]
  const total = questions.length

  const isAnswered = useCallback(
    (q: ExamQuestion) => {
      const a = answers[q.id]
      if (a === undefined) return false
      return q.question_type === 'MCQ' ? a !== '' : a.trim() !== ''
    },
    [answers]
  )
  const answeredCount = questions.filter(isAnswered).length
  const unanswered = total - answeredCount

  /* ---------- autosave (fire-and-forget) ---------- */

  const flushPending = useCallback(async () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending) {
      try {
        await api.put(`/exams/${exam.id}/answers/${pending.qid}`, { answer_text: pending.text })
      } catch (err) {
        console.error('Failed to save answer', err)
      }
    }
  }, [exam.id])

  const handleTextChange = (qid: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qid]: value }))
    pendingRef.current = { qid, text: value }
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const pending = pendingRef.current
      pendingRef.current = null
      debounceRef.current = null
      if (pending) {
        api
          .put(`/exams/${exam.id}/answers/${pending.qid}`, { answer_text: pending.text })
          .catch(err => console.error('Failed to save answer', err))
      }
    }, DEBOUNCE_MS)
  }

  const selectOption = (qid: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [qid]: optionId }))
    api
      .put(`/exams/${exam.id}/answers/${qid}`, { selected_option_id: optionId })
      .catch(err => console.error('Failed to save answer', err))
  }

  /* flush any pending debounced text when navigating between questions or unmounting */
  useEffect(() => {
    return () => {
      void flushPending()
    }
  }, [current, flushPending])

  /* ---------- submit (manual or on timer expiry) ---------- */

  const submitExam = useCallback(async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setShowConfirm(false)
    setEvalStep(0)
    stepTimersRef.current = [
      window.setTimeout(() => setEvalStep(1), 2600),
      window.setTimeout(() => setEvalStep(2), 9000),
    ]
    try {
      await flushPending()
      const res = await api.post<ExamResult>(`/exams/${exam.id}/submit`)
      stepTimersRef.current.forEach(t => window.clearTimeout(t))
      stepTimersRef.current = []
      setEvalStep(EVAL_STEPS.length)
      await new Promise(r => window.setTimeout(r, 900))
      onFinished(res)
    } catch (err) {
      stepTimersRef.current.forEach(t => window.clearTimeout(t))
      stepTimersRef.current = []
      submittingRef.current = false
      setSubmitting(false)
      setEvalStep(0)
      toast.error(err instanceof Error ? err.message : 'Failed to submit the exam. Please try again.')
    }
  }, [exam.id, flushPending, onFinished])

  useEffect(() => {
    submitRef.current = () => void submitExam()
  }, [submitExam])

  /* countdown — paused while the AI evaluation overlay is up */
  useEffect(() => {
    if (submitting) return
    const t = window.setInterval(() => {
      setSecondsLeft(s => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [submitting])

  /* auto-submit on expiry */
  useEffect(() => {
    if (secondsLeft === 0 && !timeUpRef.current) {
      timeUpRef.current = true
      toast.info("Time's up — submitting your test for evaluation.")
      submitRef.current()
    }
  }, [secondsLeft])

  /* cleanup pending timers on unmount */
  useEffect(() => {
    return () => {
      stepTimersRef.current.forEach(t => window.clearTimeout(t))
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    }
  }, [])

  const toggleMark = (qid: string) => {
    setMarked(prev => {
      const next = new Set(prev)
      if (next.has(qid)) next.delete(qid)
      else next.add(qid)
      return next
    })
  }

  if (!question || total === 0) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Theory Exam" subtitle="No questions available for this configuration." />
        <ErrorCard message="This paper has no questions. Go back and try another subject or difficulty." />
      </div>
    )
  }

  const timerDanger = secondsLeft < 60
  const timerWarn = !timerDanger && secondsLeft < 300

  return (
    <div className="space-y-6">
      {/* sticky exam header — acts as this phase's view header */}
      <div className="sticky top-0 z-30 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xs backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
              {config.subjectName} — Mock Test
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[11px] font-medium text-slate-600">
                Question {current + 1} of {total}
              </Badge>
              {totalMarks > 0 && (
                <Badge variant="outline" className="text-[11px] font-medium text-slate-600">
                  {totalMarks} marks
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold tabular-nums',
                timerDanger && 'timer-danger border-red-200 bg-red-50 text-red-600',
                timerWarn && 'border-amber-200 bg-amber-50 text-amber-700',
                !timerDanger && !timerWarn && 'border-slate-200 bg-white text-slate-700'
              )}
              aria-live="polite"
            >
              <Clock className="h-4 w-4" />
              {formatClock(secondsLeft)}
            </div>
            <Button
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={submitting}
              onClick={() => setShowConfirm(true)}
            >
              <Send className="h-3.5 w-3.5" /> Submit Test
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* main column */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* compact progress for mobile (palette is desktop-only) */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Question {current + 1} of {total}
                {marked.size > 0 && <span className="ml-2 text-amber-600">· {marked.size} marked</span>}
              </span>
              <span className="font-semibold text-violet-600">
                {answeredCount}/{total} answered
              </span>
            </div>
            <Progress className="mt-1.5 h-1.5" value={(answeredCount / total) * 100} />
          </div>

          {/* question card */}
          <Card className="shadow-xs">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Question {current + 1}</span>
                <Badge variant="outline" className={cn('text-[11px] font-semibold', TYPE_BADGE[question.question_type])}>
                  {questionTypeLabel(question.question_type)}
                </Badge>
                <Badge variant="outline" className="text-[11px] font-medium text-slate-500">
                  {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                </Badge>
                {marked.has(question.id) && (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700">
                    <Flag className="h-3 w-3" /> Marked
                  </Badge>
                )}
              </div>

              <p className="mb-6 whitespace-pre-line text-lg font-medium leading-relaxed text-slate-900">
                {question.question_text}
              </p>

              {/* answer area */}
              {question.question_type === 'MCQ' && (
                <div className="space-y-3">
                  {question.options.map((opt, i) => {
                    const selected = answers[question.id] === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={submitting}
                        onClick={() => selectOption(question.id, opt.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all',
                          selected
                            ? 'border-violet-600 bg-violet-50 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40'
                        )}
                        aria-pressed={selected}
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                            selected
                              ? 'border-violet-600 bg-violet-600 text-white'
                              : 'border-slate-300 text-slate-500'
                          )}
                        >
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1 text-sm leading-relaxed text-slate-700">{opt.text}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {question.question_type === 'SHORT_ANSWER' && (
                <Textarea
                  rows={4}
                  value={answers[question.id] ?? ''}
                  onChange={e => handleTextChange(question.id, e.target.value)}
                  placeholder="Type your answer here…"
                  className="min-h-24"
                  disabled={submitting}
                />
              )}

              {question.question_type === 'LONG_ANSWER' && (
                <Textarea
                  rows={10}
                  value={answers[question.id] ?? ''}
                  onChange={e => handleTextChange(question.id, e.target.value)}
                  placeholder="Write your detailed answer here…"
                  className="min-h-48"
                  disabled={submitting}
                />
              )}

              {/* navigation */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={current === 0 || submitting}
                  onClick={() => setCurrent(c => c - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={submitting}
                  onClick={() => toggleMark(question.id)}
                  className={cn(
                    'text-slate-500',
                    marked.has(question.id) && 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                  )}
                >
                  <Flag className="h-4 w-4" />
                  {marked.has(question.id) ? 'Marked for Review' : 'Mark for Review'}
                </Button>
                {current < total - 1 ? (
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-700"
                    disabled={submitting}
                    onClick={() => setCurrent(c => c + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting}
                    onClick={() => setShowConfirm(true)}
                  >
                    <Send className="h-3.5 w-3.5" /> Submit Test
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* question palette — desktop only */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 w-64 shrink-0">
            <Card className="shadow-xs">
              <CardContent className="space-y-4 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questions</h3>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, i) => {
                    const isCurrent = i === current
                    const isMarked = marked.has(q.id)
                    const answered = isAnswered(q)
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrent(i)}
                        className={cn(
                          'h-9 rounded-lg border text-sm font-semibold transition-colors',
                          isCurrent
                            ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                            : isMarked
                              ? 'border-amber-300 bg-amber-100 text-amber-700 hover:border-amber-400'
                              : answered
                                ? 'border-emerald-200 bg-emerald-100 text-emerald-700 hover:border-emerald-300'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:text-violet-600'
                        )}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-violet-600" /> Current
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm border border-emerald-300 bg-emerald-100" /> Answered
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm border border-amber-300 bg-amber-100" /> Marked
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm border border-slate-200 bg-white" /> Not visited
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span className="font-semibold text-slate-700">
                      {answeredCount}/{total} answered
                    </span>
                  </div>
                  <Progress className="h-2" value={(answeredCount / total) * 100} />
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      {/* submit confirmation */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit test for AI evaluation?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve answered {answeredCount} of {total} questions
              {unanswered > 0 ? ` — ${unanswered} will be marked unattempted` : ' — all questions answered!'}. The AI
              examiner takes up to ~30 seconds to grade your written answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Keep Working</AlertDialogCancel>
            <AlertDialogAction
              className="bg-violet-600 text-white hover:bg-violet-700"
              onClick={() => submitRef.current()}
            >
              <Send className="h-3.5 w-3.5" /> Submit for Evaluation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* full-screen AI evaluation overlay */}
      {submitting && <EvaluatingOverlay step={evalStep} />}
    </div>
  )
}

/* ---------- AI evaluation overlay ---------- */

function EvaluatingOverlay({ step }: { step: number }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="AI evaluation in progress"
    >
      <div className="w-full max-w-md animate-fade-in-up rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-violet-800 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
        <h3 className="mt-5 text-lg font-bold text-white">AI Examiner is evaluating your answers…</h3>
        <p className="mt-1 text-sm text-violet-100">Objective answers score instantly — written ones take a little longer.</p>
        <div className="mt-6 space-y-2.5 text-left">
          {EVAL_STEPS.map((label, i) => {
            const done = step > i
            const active = step === i
            return (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-colors',
                  done || active ? 'bg-white/15' : 'bg-white/5'
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white" />
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-white/30" />
                )}
                <span className={done ? 'text-white' : active ? 'font-medium text-white' : 'text-violet-200'}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Phase 3 — results
   ============================================================ */

function ExamResults({
  result,
  questions,
  onRestart,
  onPerformance,
}: {
  result: ExamResult
  questions: ExamQuestion[]
  onRestart: () => void
  onPerformance: () => void
}) {
  const questionById = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions])

  const optionLabel = (qid: string, optionId: string | null): string => {
    if (!optionId) return '—'
    const q = questionById.get(qid)
    const idx = q ? q.options.findIndex(o => o.id === optionId) : -1
    return idx >= 0 ? `(${String.fromCharCode(65 + idx)})` : '(?)'
  }

  const optionText = (qid: string, optionId: string | null): string => {
    if (!optionId) return '—'
    return questionById.get(qid)?.options.find(o => o.id === optionId)?.text ?? '—'
  }

  const gradeStyle = (grade: string): string => {
    switch (grade) {
      case 'A':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700'
      case 'B':
        return 'border-cyan-200 bg-cyan-50 text-cyan-700'
      case 'C':
        return 'border-amber-200 bg-amber-50 text-amber-700'
      case 'D':
        return 'border-orange-200 bg-orange-50 text-orange-700'
      default:
        return 'border-red-200 bg-red-50 text-red-700'
    }
  }

  return (
    <>
      {/* score card */}
      <Card className="shadow-xs">
        <CardContent className="p-6 text-center sm:p-8">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Test Completed!</h2>
          <p className="mt-1 text-sm text-slate-500">{result.subject} — Mock Test</p>
          <div className="mt-6 flex justify-center">
            <ProgressCircle value={result.percentage} size={140} strokeWidth={10} />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Badge variant="outline" className="px-3 py-1 text-sm font-bold tabular-nums text-slate-700">
              {result.obtained_marks} / {result.total_marks} marks
            </Badge>
            <Badge variant="outline" className={cn('px-3 py-1 text-sm font-bold', gradeStyle(result.grade))}>
              Grade {result.grade}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* AI feedback */}
      {result.analytics && (
        <AICard title="AI Feedback" icon={Sparkles}>
          <p className="whitespace-pre-line">{result.analytics.improvement_suggestions}</p>
          {result.analytics.weak_areas.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Focus areas:</span>
              {result.analytics.weak_areas.map(area => (
                <Badge
                  key={area}
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700"
                >
                  {area}
                </Badge>
              ))}
            </div>
          )}
        </AICard>
      )}

      {/* question breakdown */}
      <Card className="shadow-xs">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Question Breakdown</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Your answers vs the expected answers, with per-question AI feedback.
          </p>
        </div>
        <div className="space-y-3 p-5">
          {result.question_results.map((qr, i) => {
            const ratio = qr.marks > 0 ? qr.marks_obtained / qr.marks : 0
            const border =
              ratio >= 0.999
                ? 'border-l-emerald-500'
                : ratio > 0
                  ? 'border-l-amber-400'
                  : 'border-l-red-400'
            const mcqCorrect = qr.selected_option_id !== null && qr.selected_option_id === qr.correct_option_id

            return (
              <div key={qr.question_id} className={cn('rounded-r-lg border border-slate-200 border-l-4 p-4', border)}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Q{i + 1}</span>
                  <Badge variant="outline" className={cn('text-[11px] font-semibold', TYPE_BADGE[qr.question_type])}>
                    {questionTypeLabel(qr.question_type)}
                  </Badge>
                  <span className="ml-auto text-xs font-semibold tabular-nums text-slate-500">
                    {qr.marks_obtained}/{qr.marks} marks
                  </span>
                </div>

                <p className="text-sm font-medium leading-relaxed text-slate-800">{qr.question_text}</p>

                {qr.question_type === 'MCQ' ? (
                  <div className="mt-3 space-y-1.5 text-sm">
                    <p className={cn('flex gap-2', mcqCorrect ? 'text-emerald-700' : 'text-red-600')}>
                      <span className="shrink-0 font-semibold">Your answer:</span>
                      <span>
                        {optionLabel(qr.question_id, qr.selected_option_id)}{' '}
                        {optionText(qr.question_id, qr.selected_option_id)}
                      </span>
                    </p>
                    {!mcqCorrect && (
                      <p className="flex gap-2 text-emerald-700">
                        <span className="shrink-0 font-semibold">Correct answer:</span>
                        <span>
                          {optionLabel(qr.question_id, qr.correct_option_id)}{' '}
                          {optionText(qr.question_id, qr.correct_option_id)}
                        </span>
                      </p>
                    )}
                    {qr.explanation && (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                        <span className="font-semibold">Explanation: </span>
                        {qr.explanation}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your answer</p>
                      <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
                        {qr.student_answer && qr.student_answer.trim() ? (
                          qr.student_answer
                        ) : (
                          <span className="italic text-slate-400">Not attempted</span>
                        )}
                      </p>
                    </div>
                    {qr.feedback && (
                      <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                          AI Examiner feedback
                        </p>
                        <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                          {qr.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" /> Take Another Test
        </Button>
        <Button className="bg-violet-600 hover:bg-violet-700" onClick={onPerformance}>
          View Performance <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </>
  )
}
