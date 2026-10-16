'use client'

/* ============================================================
   AgentExam — Practical Exam view
   Ported from the original React PracticalExam.jsx: subject pill
   filter tabs → experiment grid → detail briefing + code submission
   → AI review (5–20s) → evaluated result card.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronRight,
  FlaskConical,
  Loader2,
  Play,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  AICard,
  EmptyState,
  ErrorCard,
  LoadingCard,
  ProgressCircle,
  ScorePill,
  SectionCard,
  ViewHeader,
} from '@/components/app/bits'
import { api } from '@/lib/api-client'
import { truncate } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import type { PracticalExperiment, PracticalSubmitResult } from '@/lib/types'

/* ---------- helpers ---------- */

function statusBadge(status: PracticalExperiment['status'], score: number | null) {
  switch (status) {
    case 'completed':
      return (
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700"
        >
          {score !== null && score !== undefined ? `Completed · ${Math.round(score)}%` : 'Completed'}
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-[11px] font-semibold text-amber-700"
        >
          In Progress
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="border-slate-200 bg-white text-[11px] font-medium text-slate-500">
          Not Started
        </Badge>
      )
  }
}

/* ============================================================
   Main view
   ============================================================ */

export function PracticalExamView() {
  const [experiments, setExperiments] = useState<PracticalExperiment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSubject, setActiveSubject] = useState<string>('all')
  const [selected, setSelected] = useState<PracticalExperiment | null>(null)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [evaluation, setEvaluation] = useState<PracticalSubmitResult | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get<PracticalExperiment[]>('/practical')
      .then(data => setExperiments(data || []))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load experiments'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* silent refresh after an evaluation so statuses/scores stay fresh */
  const refreshQuietly = useCallback(() => {
    api
      .get<PracticalExperiment[]>('/practical')
      .then(data => setExperiments(data || []))
      .catch(err => console.error('Failed to refresh experiments', err))
  }, [])

  const subjects = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of experiments) {
      if (!map.has(e.subjectId)) map.set(e.subjectId, e.subject)
    }
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [experiments])

  const filtered =
    activeSubject === 'all' ? experiments : experiments.filter(e => e.subjectId === activeSubject)

  const openExperiment = (exp: PracticalExperiment) => {
    setSelected(exp)
    setCode('')
    setEvaluation(null)
    setSubmitting(false)
  }

  const backToGrid = () => {
    setSelected(null)
    setEvaluation(null)
    setCode('')
  }

  const attemptAnother = () => {
    backToGrid()
    load()
  }

  /* start a session for the experiment, then submit the code for AI review */
  const handleSubmit = useCallback(async () => {
    if (!selected || !code.trim() || submitting) return
    setSubmitting(true)
    setEvaluation(null)
    try {
      const session = await api.post<{ id: string }>('/practical/start', {
        experiment_id: selected.id,
      })
      const result = await api.post<PracticalSubmitResult>(`/practical/${session.id}/submit`, { code })
      setEvaluation(result)
      setSelected(prev => (prev ? { ...prev, status: 'completed', score: result.percentage } : prev))
      refreshQuietly()
      toast.success(`Evaluation complete — you scored ${Math.round(result.percentage)}%`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to evaluate the submission. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [selected, code, submitting, refreshQuietly])

  /* ---------- loading / error states ---------- */
  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Practical Exam" subtitle="Code experiments reviewed by your AI lab examiner" />
        <LoadingCard label="Loading experiments…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Practical Exam" subtitle="Code experiments reviewed by your AI lab examiner" />
        <ErrorCard message={error} onRetry={load} />
      </div>
    )
  }

  /* ---------- detail view ---------- */
  if (selected) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2 text-slate-500 hover:text-slate-700" onClick={backToGrid}>
          <ArrowLeft className="h-4 w-4" /> Back to Experiments
        </Button>

        <ViewHeader
          title={truncate(selected.title, 48)}
          subtitle={`${selected.subject} · ${selected.marks} marks`}
        >
          {statusBadge(selected.status, selected.score)}
        </ViewHeader>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* experiment briefing */}
          <SectionCard title="Experiment Briefing" contentClassName="space-y-5">
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{selected.description}</p>
            </div>

            {selected.objective && (
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">🎯 Objective</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{selected.objective}</p>
              </div>
            )}

            {selected.instructions && (
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">📋 Instructions</h4>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {selected.instructions}
                </p>
              </div>
            )}

            {selected.expectedOutput && (
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Expected Output</h4>
                <pre className="mt-1.5 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-600">
                  {selected.expectedOutput}
                </pre>
              </div>
            )}
          </SectionCard>

          {/* submission + AI review column */}
          <div className="space-y-6">
            <SectionCard title="Your Submission" contentClassName="space-y-4">
              <Textarea
                rows={16}
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Write your code here…"
                className="min-h-[320px] font-mono text-sm leading-relaxed"
                disabled={submitting}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  {code.trim()
                    ? `${code.trim().split('\n').length} lines · ${code.trim().length} characters`
                    : 'Paste or write your implementation, then let the AI review it'}
                </p>
                <Button
                  className="bg-violet-600 hover:bg-violet-700"
                  disabled={!code.trim() || submitting}
                  onClick={() => void handleSubmit()}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {submitting ? 'Evaluating…' : 'Submit & Evaluate'}
                </Button>
              </div>
            </SectionCard>

            {/* AI review in progress */}
            {submitting && (
              <div className="animate-fade-in-up rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-cyan-50/40 p-6 text-center shadow-xs">
                <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-violet-200/60" />
                  <Loader2 className="relative h-8 w-8 animate-spin text-violet-600" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-violet-900">AI is reviewing your submission…</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Your AI lab examiner is reading the code — this can take up to 20 seconds.
                </p>
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <span className="typing-dot h-2 w-2 rounded-full bg-violet-500" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-violet-500" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-violet-500" />
                </div>
              </div>
            )}

            {/* evaluated result */}
            {evaluation && !submitting && (
              <AICard title="AI Evaluation" icon={Sparkles} className="animate-fade-in-up">
                <div className="flex flex-col items-center text-center">
                  <ProgressCircle value={evaluation.percentage} size={120} strokeWidth={9} />
                  <p className="mt-4 text-sm font-semibold text-slate-800">
                    {Math.round(evaluation.score)} / {selected.marks} marks
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{evaluation.feedback}</p>
                  {evaluation.suggestions && (
                    <div className="mt-4 w-full rounded-lg border border-violet-100 bg-white/70 p-3 text-left">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                        Improvement suggestions
                      </p>
                      <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                        {evaluation.suggestions}
                      </p>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="mt-5" onClick={attemptAnother}>
                    <FlaskConical className="h-3.5 w-3.5" /> Attempt Another Experiment
                  </Button>
                </div>
              </AICard>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ---------- grid view ---------- */
  return (
    <div className="animate-fade-in-up space-y-6">
      <ViewHeader title="Practical Exam" subtitle="Code experiments reviewed by your AI lab examiner" />

      {experiments.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No experiments yet"
          message="Practical experiments will appear here once your subjects have lab content."
        />
      ) : (
        <>
          {/* subject pill tabs */}
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter experiments by subject">
            <button
              type="button"
              role="tab"
              aria-selected={activeSubject === 'all'}
              onClick={() => setActiveSubject('all')}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                activeSubject === 'all'
                  ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700'
              )}
            >
              All Experiments
            </button>
            {subjects.map(s => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activeSubject === s.id}
                onClick={() => setActiveSubject(s.id)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                  activeSubject === s.id
                    ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700'
                )}
              >
                {s.name}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="Nothing in this subject"
              message="No experiments match the selected subject filter."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(exp => (
                <ExperimentCard key={exp.id} exp={exp} onOpen={() => openExperiment(exp)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ---------- experiment card ---------- */

function ExperimentCard({ exp, onOpen }: { exp: PracticalExperiment; onOpen: () => void }) {
  return (
    <Card
      className="group cursor-pointer shadow-xs transition-all hover:border-cyan-300 hover:shadow-md"
      onClick={onOpen}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <FlaskConical className="h-5 w-5" />
          </div>
          {statusBadge(exp.status, exp.score)}
        </div>

        <h3 className="mt-3 line-clamp-2 font-semibold text-slate-900">{exp.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {truncate(exp.description, 110)}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="max-w-full truncate text-[11px] font-medium text-slate-500">
            {truncate(exp.subject, 26)}
          </Badge>
          <Badge variant="outline" className="text-[11px] font-medium text-slate-500">
            {exp.marks} marks
          </Badge>
          {exp.score !== null && exp.score !== undefined && <ScorePill score={exp.score} />}
        </div>

        <div className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-violet-600">
          {exp.status === 'completed' ? 'Re-attempt' : 'Start experiment'}
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </CardContent>
    </Card>
  )
}
