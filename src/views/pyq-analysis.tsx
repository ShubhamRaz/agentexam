'use client'

/* ============================================
   AGENTEXAM — PYQ Analysis view
   Ported from original Frontend/src/pages/PYQAnalysis.jsx
   All analytics computed client-side from GET /api/pyqs
   ============================================ */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Search, SearchX } from 'lucide-react'
import { api } from '@/lib/api-client'
import type { PYQ, Subject } from '@/lib/types'
import { CHART_COLORS } from '@/lib/helpers'
import { AIBadge, EmptyState, ErrorCard, SectionCard, ViewHeader } from '@/components/app/bits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const TYPE_BADGE: Record<string, string> = {
  'Long Answer': 'border-violet-200 bg-violet-50 text-violet-700',
  'Short Answer': 'border-amber-200 bg-amber-50 text-amber-700',
  Objective: 'border-cyan-200 bg-cyan-50 text-cyan-700',
}

interface PieLabelDatum {
  name?: string
  percent?: number
}

const renderPieLabel = ({ name, percent }: PieLabelDatum) =>
  `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`

function pillClass(active: boolean) {
  return cn(
    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
    active
      ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
      : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700'
  )
}

function chipClass(active: boolean) {
  return cn(
    'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
    active
      ? 'border-violet-600 bg-violet-50 text-violet-700'
      : 'border-slate-200 bg-white text-slate-500 hover:border-violet-300 hover:text-violet-700'
  )
}

function PYQSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

export function PYQAnalysisView() {
  const [pyqs, setPyqs] = useState<PYQ[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeSubject, setActiveSubject] = useState<'all' | string>('all')
  const [yearFilter, setYearFilter] = useState<'all' | number>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pyqData, subjectData] = await Promise.all([
        api.get<PYQ[]>('/pyqs'),
        api.get<Subject[]>('/subjects'),
      ])
      setPyqs(pyqData)
      setSubjects(subjectData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PYQs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* ---------- client-side analytics ---------- */

  const filtered = useMemo(
    () =>
      pyqs
        .filter(p => activeSubject === 'all' || p.subjectId === activeSubject)
        .filter(p => yearFilter === 'all' || p.year === yearFilter)
        .filter(p => {
          const q = search.trim().toLowerCase()
          if (!q) return true
          return p.question.toLowerCase().includes(q) || p.topic.toLowerCase().includes(q)
        }),
    [pyqs, activeSubject, yearFilter, search]
  )

  const years = useMemo(
    () => Array.from(new Set(pyqs.map(p => p.year))).sort((a, b) => b - a),
    [pyqs]
  )

  const topicData = useMemo(() => {
    const freq = new Map<string, number>()
    for (const p of filtered) freq.set(p.topic, (freq.get(p.topic) ?? 0) + 1)
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))
  }, [filtered])

  const typeData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of filtered) counts.set(p.type, (counts.get(p.type) ?? 0) + 1)
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }))
  }, [filtered])

  if (loading) return <div className="animate-fade-in-up"><PYQSkeleton /></div>
  if (error) {
    return (
      <div className="animate-fade-in-up">
        <ViewHeader title="PYQ Analysis" subtitle="Previous year question patterns & trends" />
        <ErrorCard message={error} onRetry={load} />
      </div>
    )
  }

  const hasFilters = activeSubject !== 'all' || yearFilter !== 'all' || search.trim() !== ''

  return (
    <div className="animate-fade-in-up space-y-6">
      <ViewHeader
        title="PYQ Analysis"
        subtitle="Previous year question patterns, topics & trends"
      >
        <AIBadge label="AI Analyzed" />
      </ViewHeader>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className={chipClass(yearFilter === 'all')}
              onClick={() => setYearFilter('all')}
            >
              All Years
            </button>
            {years.map(y => (
              <button
                key={y}
                type="button"
                className={chipClass(yearFilter === y)}
                onClick={() => setYearFilter(y)}
              >
                {y}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions or topics…"
              className="h-9 bg-white pl-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Topic Frequency" badge={<AIBadge />} className="animate-fade-in-up">
          {topicData.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-sm text-slate-400">
              No PYQs found for current filters
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topicData} layout="vertical" margin={{ left: 10, right: 20, top: 4, bottom: 4 }}>
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
                  width={150}
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
                  formatter={value => [value, 'PYQs']}
                  cursor={{ fill: 'rgba(124, 58, 237, 0.06)' }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
                  {topicData.map((t, i) => (
                    <Cell key={t.name} fill={CHART_COLORS[i % CHART_COLORS.length]!} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Question Type Distribution" className="animate-fade-in-up stagger-1">
          {typeData.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-sm text-slate-400">
              No PYQs found for current filters
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="46%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={renderPieLabel}
                >
                  {typeData.map((t, i) => (
                    <Cell key={t.name} fill={CHART_COLORS[i % CHART_COLORS.length]!} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={value => <span className="text-xs text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* PYQ table */}
      <SectionCard
        title={`Previous Year Questions (${filtered.length})`}
        badge={
          <Badge variant="outline" className="bg-slate-50 text-[11px] font-medium text-slate-500">
            {pyqs.length} total
          </Badge>
        }
        contentClassName="p-0"
        className="animate-fade-in-up stagger-2"
      >
        {filtered.length === 0 ? (
          <div className="p-5">
            {pyqs.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="No PYQs available"
                message="PYQ analysis appears once you upload previous-year papers — AI extracts and maps them to your topics."
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title="No questions match your filters"
                message="Try a different subject, year, or search keyword."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-violet-200 text-violet-700 hover:bg-violet-50"
                    onClick={() => {
                      setActiveSubject('all')
                      setYearFilter('all')
                      setSearch('')
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="w-[74px]">Year</TableHead>
                  <TableHead className="min-w-[130px]">Subject</TableHead>
                  <TableHead className="min-w-[160px]">Topic</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[70px] text-center">Marks</TableHead>
                  <TableHead className="w-[70px] text-center">Freq</TableHead>
                  <TableHead className="min-w-[280px]">Question</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(pyq => (
                  <TableRow key={pyq.id} className="transition-colors hover:bg-violet-50/30">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-violet-200 bg-violet-50 font-semibold tabular-nums text-violet-700"
                      >
                        {pyq.year}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{pyq.subject}</TableCell>
                    <TableCell className="text-sm font-medium text-slate-800">{pyq.topic}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[11px]',
                          TYPE_BADGE[pyq.type] ?? 'border-slate-200 bg-slate-50 text-slate-600'
                        )}
                      >
                        {pyq.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold tabular-nums text-slate-700">
                      {pyq.marks}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'text-sm tabular-nums',
                          pyq.frequency >= 3 ? 'font-bold text-red-600' : 'text-slate-500'
                        )}
                        title={pyq.frequency >= 3 ? 'Repeated question — high yield' : undefined}
                      >
                        {pyq.frequency}×
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[360px]">
                      <p className="truncate text-sm text-slate-500" title={pyq.question}>
                        {pyq.question}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {hasFilters && filtered.length > 0 && (
        <p className="text-center text-xs text-slate-400">
          Showing {filtered.length} of {pyqs.length} questions — filtered
        </p>
      )}
    </div>
  )
}

export default PYQAnalysisView
