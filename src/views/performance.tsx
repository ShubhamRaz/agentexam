'use client'

/* AgentExam — Performance Analytics view (ported from original Performance.jsx) */

import { useCallback, useEffect, useState } from 'react'
import {
  Area, AreaChart, PolarAngleAxis, PolarGrid, Radar, RadarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Award, BarChart3, BookOpen, Target, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AIBadge, ErrorCard, EmptyState, LoadingCard, ScorePill, SectionCard, StatCard, ViewHeader,
} from '@/components/app/bits'
import { api } from '@/lib/api-client'
import { getScoreBarColor } from '@/lib/helpers'
import type { PerformanceData } from '@/lib/types'
import { cn } from '@/lib/utils'

const TOPIC_STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  strong: { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Strong' },
  weak: { badge: 'border-red-200 bg-red-50 text-red-700', label: 'Weak' },
  insufficient: { badge: 'border-slate-200 bg-slate-100 text-slate-600', label: 'Low attempts' },
}

export function PerformanceView() {
  const [data, setData] = useState<PerformanceData | null>(null)
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
    api.get<PerformanceData>('/performance/me')
      .then(d => { if (!cancelled) setData(d) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load performance data') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadTick])

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Performance Analytics" subtitle="Track your scores, accuracy and topic mastery over time" />
        <LoadingCard label="Crunching your performance numbers…" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Performance Analytics" subtitle="Track your scores, accuracy and topic mastery over time" />
        <ErrorCard message={error || 'Performance data unavailable'} onRetry={retry} />
      </div>
    )
  }

  const { overall, scoreTrend, accuracyTrend, subjectPerformance, topicPerformance, weakTopics } = data

  if (overall.totalTests === 0) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Performance Analytics" subtitle="Track your scores, accuracy and topic mastery over time" />
        <EmptyState
          icon={BarChart3}
          title="No test data yet"
          message="Take a mock test to unlock analytics — score trends, subject comparison and AI topic insights."
        />
      </div>
    )
  }

  const radarData = subjectPerformance.map(s => ({
    subject: s.subject.split(' ')[0] ?? s.subject,
    score: s.score,
    accuracy: s.accuracy,
  }))

  return (
    <div className="animate-fade-in-up space-y-6">
      <ViewHeader title="Performance Analytics" subtitle="Track your scores, accuracy and topic mastery over time" />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Total Tests" value={overall.totalTests} iconClassName="bg-violet-50 text-violet-600" />
        <StatCard
          icon={Award}
          label="Average Score"
          value={`${Math.round(overall.averageScore)}%`}
          change={`+${Math.round(overall.improvement)}% this month`}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard icon={Target} label="Accuracy" value={`${Math.round(overall.accuracy)}%`} iconClassName="bg-cyan-50 text-cyan-600" />
        <StatCard icon={TrendingUp} label="Study Hours" value={`${overall.studyHours}h`} iconClassName="bg-amber-50 text-amber-600" />
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader className="border-b border-slate-100 py-4">
            <CardTitle className="text-sm font-semibold text-slate-900">Score Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={scoreTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="aeScoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={2.5} fill="url(#aeScoreGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="border-b border-slate-100 py-4">
            <CardTitle className="text-sm font-semibold text-slate-900">Accuracy Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={accuracyTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="aeAccGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2.5} fill="url(#aeAccGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Radar + topic performance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader className="border-b border-slate-100 py-4">
            <CardTitle className="text-sm font-semibold text-slate-900">Subject Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#0F172A', fontSize: 11 }} />
                <Radar name="Score" dataKey="score" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.3} strokeWidth={2} />
                <Radar name="Accuracy" dataKey="accuracy" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <SectionCard title="Topic Performance" badge={<AIBadge label="AI Analyzed" />} contentClassName="p-0">
          <div className="ae-scroll max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {topicPerformance.map(tp => {
              const status = TOPIC_STATUS_STYLES[tp.status] ?? TOPIC_STATUS_STYLES.insufficient
              return (
                <div key={`${tp.subject}-${tp.topic}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
                  <p className="w-40 min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{tp.topic}</p>
                  <Badge variant="outline" className="max-w-32 truncate border-slate-200 bg-slate-50 text-[11px] text-slate-600">
                    {tp.subject}
                  </Badge>
                  <div className="h-1.5 min-w-16 flex-[2] overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full transition-all', getScoreBarColor(tp.score))}
                      style={{ width: `${Math.max(2, Math.min(100, tp.score))}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <ScorePill score={tp.score} />
                    <Badge variant="outline" className={cn('text-[11px]', status.badge)}>{status.label}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>

      {/* Weak topics — AI recommendations */}
      <SectionCard title="⚠️ Weak Topics — AI Recommendations" badge={<AIBadge label="AI Recommendations" />}>
        {weakTopics.length === 0 ? (
          <p className="text-sm text-slate-500">No weak topics detected — keep up the great work!</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {weakTopics.map(wt => (
              <div key={`${wt.subject}-${wt.topic}`} className="rounded-lg border-l-4 border-red-400 bg-red-50/50 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">{wt.topic}</span>
                  <ScorePill score={wt.score} />
                </div>
                <p className="mb-2 text-xs text-slate-500">{wt.subject}</p>
                <p className="text-sm leading-relaxed text-slate-600">💡 {wt.recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
