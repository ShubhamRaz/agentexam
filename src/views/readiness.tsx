'use client'

/* AgentExam — Exam Readiness view (ported from original Readiness.jsx) */

import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, ArrowRight, CalendarDays, Clock, Sparkles, TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AICard, ErrorCard, LoadingCard, ProgressCircle, SectionCard, ViewHeader,
} from '@/components/app/bits'
import { api } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { formatDate, getScoreBarColor, getScoreColor } from '@/lib/helpers'
import type { ReadinessData, ViewId } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUS_META: Record<string, { label: string; chip: string }> = {
  HIGH: { label: 'Exam Ready', chip: 'border border-emerald-300/50 bg-emerald-400/20 text-emerald-100' },
  MODERATE: { label: 'Getting There', chip: 'border border-amber-300/50 bg-amber-400/20 text-amber-100' },
  LOW: { label: 'Needs Work', chip: 'border border-red-300/50 bg-red-400/20 text-red-100' },
  INSUFFICIENT_DATA: { label: 'Insufficient Data', chip: 'border border-white/30 bg-white/15 text-slate-100' },
}

const SUBJECT_STATUS: Record<string, { label: string; badge: string }> = {
  on_track: { label: 'On Track', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  needs_attention: { label: 'Needs Attention', badge: 'border-amber-200 bg-amber-50 text-amber-700' },
  at_risk: { label: 'At Risk', badge: 'border-red-200 bg-red-50 text-red-700' },
}

const PRIORITY_CIRCLE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
}

const PRIORITY_BADGE: Record<string, { label: string; badge: string }> = {
  high: { label: 'High', badge: 'border-red-200 bg-red-50 text-red-700' },
  medium: { label: 'Medium', badge: 'border-amber-200 bg-amber-50 text-amber-700' },
  low: { label: 'Low', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
}

export function ReadinessView({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const { user } = useAuth()
  const [data, setData] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadTick(t => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    api.get<ReadinessData>('/performance/me/readiness')
      .then(d => { if (!cancelled) setData(d) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load readiness data') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadTick])

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Exam Readiness" subtitle="AI-assessed preparation level across all your subjects" />
        <LoadingCard label="Assessing your exam readiness…" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Exam Readiness" subtitle="AI-assessed preparation level across all your subjects" />
        <ErrorCard message={error || 'Readiness data unavailable'} onRetry={retry} />
      </div>
    )
  }

  const { overallScore, status, estimatedStudyHoursNeeded, breakdown, subjectReadiness, riskAreas, recommendations } = data
  const statusMeta = STATUS_META[status] ?? STATUS_META.INSUFFICIENT_DATA

  const daysLeft = user?.examDate
    ? Math.max(0, Math.ceil((new Date(user.examDate).getTime() - Date.now()) / 86_400_000))
    : null

  const tiles = [
    { label: 'Overall Accuracy', value: `${Math.round(breakdown.accuracy)}%`, score: breakdown.accuracy },
    { label: 'Topics Attempted', value: String(breakdown.topicsAttempted), score: breakdown.topicsAttempted },
    { label: 'Study Hours Needed', value: `${estimatedStudyHoursNeeded}h`, score: estimatedStudyHoursNeeded },
  ]

  return (
    <div className="animate-fade-in-up space-y-6">
      <ViewHeader title="Exam Readiness" subtitle="AI-assessed preparation level across all your subjects" />

      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-violet-950 via-violet-700 to-cyan-600 p-6 text-white shadow-xs sm:p-8">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:gap-12">
          <div className="flex shrink-0 flex-col items-center gap-3">
            <ProgressCircle value={overallScore} size={180} strokeWidth={12} color="#FFFFFF" trackColor="rgba(255,255,255,0.25)">
              <span className="text-4xl font-bold text-white">{Math.round(overallScore)}%</span>
            </ProgressCircle>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Readiness</p>
          </div>

          <div className="min-w-0 flex-1 space-y-4 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <h2 className="text-2xl font-bold">Are you ready for the exam?</h2>
              <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', statusMeta.chip)}>
                {statusMeta.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-start">
              <span className="inline-flex items-center gap-1.5 text-sm text-white/90">
                <CalendarDays className="h-4 w-4 text-white/70" />
                Exam: {user?.examDate ? formatDate(user.examDate) : 'Not set'}
              </span>
              {daysLeft !== null && (
                <span className="inline-flex items-center gap-1.5 text-sm text-white/90">
                  <Clock className="h-4 w-4 text-white/70" />
                  {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-sm text-white/90">
                <TrendingUp className="h-4 w-4 text-white/70" />
                {estimatedStudyHoursNeeded} study {estimatedStudyHoursNeeded === 1 ? 'hour' : 'hours'} needed
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown tiles */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {tiles.map(tile => (
            <div key={tile.label} className="rounded-xl bg-white p-4 text-center shadow-xs">
              <p className={cn('text-3xl font-bold tabular-nums', getScoreColor(tile.score))}>{tile.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{tile.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Subject readiness + risk areas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Subject Readiness">
          <div className="space-y-5">
            {subjectReadiness.length === 0 && <p className="text-sm text-slate-500">No subject data yet — take a test to unlock readiness.</p>}
            {subjectReadiness.map(sr => {
              const meta = SUBJECT_STATUS[sr.status] ?? SUBJECT_STATUS.needs_attention
              return (
                <div key={sr.subject}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">{sr.subject}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-[11px]', meta.badge)}>{meta.label}</Badge>
                      <span className={cn('text-sm font-semibold tabular-nums', getScoreColor(sr.score))}>{Math.round(sr.score)}%</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full transition-all', getScoreBarColor(sr.score))}
                      style={{ width: `${Math.max(2, Math.min(100, sr.score))}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{sr.topicsReady} of {sr.totalTopics} topics ready</p>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard title="Risk Areas" badge={<AlertTriangle className="h-4 w-4 text-red-500" />}>
          {riskAreas.length === 0 && <p className="text-sm text-slate-500">No risk areas detected — you&apos;re on solid ground.</p>}
          <div className="space-y-3">
            {riskAreas.map(ra => (
              <div
                key={`${ra.subject}-${ra.topic}`}
                className={cn(
                  'rounded-lg border-l-4 p-4',
                  ra.risk === 'high' ? 'border-l-red-400 bg-red-50/60' : 'border-l-amber-400 bg-amber-50/60'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{ra.topic}</span>
                  <Badge variant="outline" className={cn(
                    'text-[11px] capitalize',
                    ra.risk === 'high' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                  )}>
                    {ra.risk} risk
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{ra.subject}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{ra.reason}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* AI recommendations */}
      <AICard title="AI Recommendations" icon={Sparkles}>
        <div className="space-y-3">
          {recommendations.length === 0 && <p className="text-sm text-slate-500">No recommendations right now — you&apos;re on track!</p>}
          {recommendations.map((rec, i) => {
            const badge = PRIORITY_BADGE[rec.priority] ?? PRIORITY_BADGE.medium
            return (
              <div
                key={`${rec.action}-${i}`}
                className="flex flex-col gap-3 rounded-lg bg-white/70 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    PRIORITY_CIRCLE[rec.priority] ?? PRIORITY_CIRCLE.medium
                  )}>
                    {i + 1}
                  </span>
                  <p className="text-sm font-medium leading-relaxed text-slate-800">{rec.action}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-10 sm:pl-0">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    <Clock className="h-3 w-3" />
                    {rec.estimatedTime}
                  </span>
                  <Badge variant="outline" className={cn('text-[11px] capitalize', badge.badge)}>{badge.label} priority</Badge>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-5 flex justify-center sm:justify-start">
          <Button className="bg-violet-600 font-semibold hover:bg-violet-700" onClick={() => onNavigate('exam')}>
            Start Practicing
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </AICard>
    </div>
  )
}
