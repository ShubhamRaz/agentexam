'use client'

/* ============================================
   AGENTEXAM — Syllabus Analysis view
   Ported from original Frontend/src/pages/SyllabusAnalysis.jsx
   ============================================ */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BookOpen, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type { Importance, Subject, Unit } from '@/lib/types'
import { IMPORTANCE_STYLES } from '@/lib/helpers'
import { AIBadge, EmptyState, ErrorCard, ImportanceBadge, SectionCard, ViewHeader } from '@/components/app/bits'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface UnitWithSubject extends Unit {
  subjectName: string
}

const IMPORTANCE_BAR: Record<Importance, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
}

const MAX_WEIGHTAGE = 20

function pillClass(active: boolean) {
  return cn(
    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
    active
      ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
      : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700'
  )
}

function SyllabusSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-96 rounded-xl" />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function SyllabusAnalysisView() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [activeSubject, setActiveSubject] = useState<'all' | string>('all')
  const [units, setUnits] = useState<UnitWithSubject[]>([])
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [unitsLoading, setUnitsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const subs = await api.get<Subject[]>('/subjects')
      setSubjects(subs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* load units whenever the active subject (or subject list) changes */
  useEffect(() => {
    if (loading || subjects.length === 0) return
    let cancelled = false
    setUnitsLoading(true)
    ;(async () => {
      try {
        let combined: UnitWithSubject[] = []
        if (activeSubject === 'all') {
          const lists = await Promise.all(
            subjects.map(s => api.get<Unit[]>(`/subjects/${s.id}/units`))
          )
          combined = lists.flatMap((us, i) =>
            us.map(u => ({ ...u, subjectName: subjects[i]!.name }))
          )
        } else {
          const us = await api.get<Unit[]>(`/subjects/${activeSubject}/units`)
          combined = us.map(u => ({
            ...u,
            subjectName: subjects.find(s => s.id === activeSubject)?.name ?? '',
          }))
        }
        if (cancelled) return
        setUnits(combined)
        setExpandedUnits(new Set(combined[0] ? [combined[0].id] : []))
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load syllabus')
          setUnits([])
          setExpandedUnits(new Set())
        }
      } finally {
        if (!cancelled) setUnitsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeSubject, subjects, loading])

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }

  /* ---------- analytics ---------- */

  const allTopics = useMemo(() => units.flatMap(u => u.topics), [units])

  const topTopics = useMemo(
    () => [...allTopics].sort((a, b) => b.weightage - a.weightage).slice(0, 8),
    [allTopics]
  )

  const importantTopics = useMemo(
    () =>
      allTopics
        .filter(t => t.importance === 'high')
        .sort((a, b) => b.weightage - a.weightage || b.pyqFrequency - a.pyqFrequency)
        .slice(0, 6),
    [allTopics]
  )

  const counts = useMemo(
    () => ({
      high: allTopics.filter(t => t.importance === 'high').length,
      medium: allTopics.filter(t => t.importance === 'medium').length,
      low: allTopics.filter(t => t.importance === 'low').length,
    }),
    [allTopics]
  )

  if (loading) return <div className="animate-fade-in-up"><SyllabusSkeleton /></div>
  if (error) {
    return (
      <div className="animate-fade-in-up">
        <ViewHeader title="Syllabus Analysis" subtitle="AI-analyzed topic importance & weightage" />
        <ErrorCard message={error} onRetry={load} />
      </div>
    )
  }

  const activeSubjectName =
    activeSubject === 'all'
      ? 'All Subjects'
      : subjects.find(s => s.id === activeSubject)?.name ?? ''

  return (
    <div className="animate-fade-in-up space-y-6">
      <ViewHeader
        title="Syllabus Analysis"
        subtitle="AI-analyzed syllabus breakdown with topic importance & exam weightage"
      >
        <AIBadge label="AI Analyzed" />
      </ViewHeader>

      {/* Subject pill tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={pillClass(activeSubject === 'all')} onClick={() => setActiveSubject('all')}>
          All Subjects
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            type="button"
            className={pillClass(activeSubject === s.id)}
            onClick={() => setActiveSubject(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      {unitsLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16 shadow-xs">
          <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
          <span className="text-sm text-slate-500">Analyzing syllabus…</span>
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          message="Add a subject in Materials first, then upload its syllabus to unlock analysis."
        />
      ) : units.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No syllabus data"
          message={`Upload a syllabus${activeSubject === 'all' ? '' : ` for ${activeSubjectName}`} to see analysis.`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left: units accordion */}
          <SectionCard
            title={`${activeSubjectName} — Syllabus Breakdown`}
            badge={
              <Badge variant="outline" className="bg-slate-50 text-[11px] font-medium text-slate-500">
                {allTopics.length} topics · {units.length} units
              </Badge>
            }
            contentClassName="p-0"
            className="animate-fade-in-up self-start"
          >
            <div>
              {units.map(unit => {
                const open = expandedUnits.has(unit.id)
                return (
                  <div key={unit.id} className="border-b border-slate-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleUnit(unit.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                    >
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                          open && 'rotate-180'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{unit.name}</p>
                        {activeSubject === 'all' && (
                          <p className="mt-0.5 truncate text-xs text-violet-600">{unit.subjectName}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0 bg-slate-50 text-[11px] text-slate-500">
                        {unit.topics.length} topics
                      </Badge>
                    </button>
                    {open && (
                      <div className="animate-fade-in-up">
                        {unit.topics.map(topic => (
                          <div
                            key={topic.id}
                            className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 bg-slate-50/40 px-5 py-3"
                          >
                            <span className="min-w-[140px] flex-1 truncate text-sm text-slate-700">
                              {topic.name}
                            </span>
                            <ImportanceBadge importance={topic.importance} />
                            <span
                              className="w-14 shrink-0 text-xs tabular-nums text-slate-400"
                              title="Appeared in previous year papers"
                            >
                              📄 {topic.pyqFrequency}×
                            </span>
                            <div className="flex w-32 shrink-0 items-center gap-2">
                              <Progress
                                value={Math.min(100, (topic.weightage / MAX_WEIGHTAGE) * 100)}
                                className="h-1.5 flex-1 [&_[data-slot=progress-indicator]]:bg-violet-600"
                              />
                              <span className="w-8 text-right text-xs font-semibold tabular-nums text-slate-500">
                                {topic.weightage}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </SectionCard>

          {/* Right rail */}
          <div className="flex flex-col gap-6">
            <SectionCard title="Topic Weightage" className="animate-fade-in-up stagger-1">
              {topTopics.length === 0 ? (
                <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
                  No topics to chart
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topTopics} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#94A3B8' }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#0F172A' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                      }}
                      formatter={value => [`${value}%`, 'Weightage']}
                      cursor={{ fill: 'rgba(124, 58, 237, 0.06)' }}
                    />
                    <Bar dataKey="weightage" radius={[0, 4, 4, 0]} barSize={16}>
                      {topTopics.map(t => (
                        <Cell key={t.id} fill={IMPORTANCE_BAR[t.importance] ?? IMPORTANCE_BAR.medium} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard title="🔥 Most Important Topics" className="animate-fade-in-up stagger-2">
              {importantTopics.length === 0 ? (
                <p className="py-4 text-sm text-slate-400">No high-priority topics detected.</p>
              ) : (
                <ol className="space-y-3">
                  {importantTopics.map((t, i) => (
                    <li key={t.id} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{t.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{t.pyqFrequency}× in PYQs</p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-violet-200 bg-violet-50 text-[11px] font-semibold text-violet-700"
                      >
                        {t.weightage}%
                      </Badge>
                    </li>
                  ))}
                </ol>
              )}
            </SectionCard>

            <SectionCard title="Summary" className="animate-fade-in-up stagger-3">
              <div className="space-y-4">
                {(['high', 'medium', 'low'] as Importance[]).map(level => (
                  <div key={level} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-600">
                      <ImportanceBadge importance={level} />
                      <span className="capitalize">{level} priority</span>
                    </span>
                    <Badge
                      variant="outline"
                      className={cn('tabular-nums', IMPORTANCE_STYLES[level]!.badge)}
                    >
                      {counts[level]} topics
                    </Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}

export default SyllabusAnalysisView
