'use client'

/* AgentExam — Study Plan view (ported from original StudyPlan.jsx) */

import { useCallback, useEffect, useState } from 'react'
import {
  BookOpen, CalendarCheck, ChevronDown, Clock, Loader2, PenTool, RefreshCw, Sparkles, Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AIBadge, EmptyState, ErrorCard, LoadingCard, ViewHeader,
} from '@/components/app/bits'
import { api } from '@/lib/api-client'
import type { StudyPlanData, StudyPlanTask } from '@/lib/types'
import { cn } from '@/lib/utils'

const PRIORITY_STRIP: Record<string, string> = {
  high: 'border-l-red-400',
  medium: 'border-l-amber-400',
  low: 'border-l-emerald-400',
}

const TYPE_META: Record<string, { label: string; badge: string; icon: typeof BookOpen }> = {
  study: { label: 'Study', badge: 'border-violet-200 bg-violet-50 text-violet-700', icon: BookOpen },
  practice: { label: 'Practice', badge: 'border-cyan-200 bg-cyan-50 text-cyan-700', icon: PenTool },
  test: { label: 'Test', badge: 'border-amber-200 bg-amber-50 text-amber-700', icon: Target },
  revision: { label: 'Revision', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: CalendarCheck },
}

function computeExpanded(plan: StudyPlanData): Record<string, boolean> {
  const expanded: Record<string, boolean> = {}
  let firstIncomplete = true
  for (const day of plan.days) {
    const hasIncomplete = day.tasks.some(t => !t.completed)
    const expand = day.isToday || (firstIncomplete && hasIncomplete)
    if (firstIncomplete && hasIncomplete) firstIncomplete = false
    expanded[day.date] = expand
  }
  return expanded
}

export function StudyPlanView() {
  const [plan, setPlan] = useState<StudyPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const [regenerating, setRegenerating] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadTick(t => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    api.get<StudyPlanData>('/study-plan/me')
      .then(d => {
        if (cancelled) return
        setPlan(d)
        setExpanded(computeExpanded(d))
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load study plan') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadTick])

  const regenerate = useCallback(async () => {
    setRegenerating(true)
    try {
      const d = await api.post<StudyPlanData>('/study-plan/generate')
      setPlan(d)
      setExpanded(computeExpanded(d))
      toast.success('Study plan regenerated from your weak topics')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate study plan')
    } finally {
      setRegenerating(false)
    }
  }, [])

  const toggleTask = useCallback(async (dayDate: string, task: StudyPlanTask) => {
    const next = !task.completed
    // Optimistic flip
    setPlan(prev => prev ? {
      ...prev,
      days: prev.days.map(d => d.date === dayDate
        ? { ...d, tasks: d.tasks.map(t => t.id === task.id ? { ...t, completed: next } : t) }
        : d),
    } : prev)
    try {
      await api.patch<{ ok: boolean }>(`/study-plan/tasks/${task.id}/status`, { status: next ? 'completed' : 'pending' })
    } catch (err) {
      // Revert on failure
      setPlan(prev => prev ? {
        ...prev,
        days: prev.days.map(d => d.date === dayDate
          ? { ...d, tasks: d.tasks.map(t => t.id === task.id ? { ...t, completed: task.completed } : t) }
          : d),
      } : prev)
      toast.error(err instanceof Error ? err.message : 'Could not update task — please try again')
    }
  }, [])

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Study Plan" subtitle="Your AI-generated day-by-day preparation schedule" />
        <LoadingCard label="Loading your personalized plan…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Study Plan" subtitle="Your AI-generated day-by-day preparation schedule" />
        <ErrorCard message={error} onRetry={retry} />
      </div>
    )
  }

  if (!plan || plan.days.length === 0) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Study Plan" subtitle="Your AI-generated day-by-day preparation schedule" />
        <EmptyState
          icon={CalendarCheck}
          title="No study plan yet"
          message="Generate a personalized plan built from your weak topics and exam date."
          action={
            <Button className="bg-violet-600 font-semibold hover:bg-violet-700" onClick={regenerate} disabled={regenerating}>
              {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Plan
            </Button>
          }
        />
      </div>
    )
  }

  const totalTasks = plan.days.reduce((sum, d) => sum + d.tasks.length, 0)
  const completedTasks = plan.days.reduce((sum, d) => sum + d.tasks.filter(t => t.completed).length, 0)
  const progressPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  return (
    <div className="animate-fade-in-up space-y-6">
      <ViewHeader title="Study Plan" subtitle="Your AI-generated day-by-day preparation schedule" />

      {/* Overview */}
      <Card className="shadow-xs">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Sparkles className="h-5 w-5 text-violet-600" />
                Your Personalized Study Plan
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                AI-optimized for your exam · {plan.totalDays} {plan.totalDays === 1 ? 'day' : 'days'} · {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AIBadge label="AI Generated" />
              <Button variant="ghost" size="sm" onClick={regenerate} disabled={regenerating} className="text-slate-600 hover:text-violet-700">
                {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {regenerating ? 'Regenerating…' : 'Regenerate Plan'}
              </Button>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{completedTasks} of {totalTasks} tasks completed</span>
              <span className="tabular-nums">{Math.round(progressPct)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-500 transition-all duration-500"
                style={{ width: `${Math.max(totalTasks > 0 ? 2 : 0, progressPct)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day sections */}
      <div className="space-y-4">
        {plan.days.map(day => {
          const isOpen = expanded[day.date] ?? false
          const doneCount = day.tasks.filter(t => t.completed).length
          return (
            <Card key={day.date} className={cn('gap-0 overflow-hidden py-0 shadow-xs', day.isToday && 'border-violet-200')}>
              <button
                type="button"
                onClick={() => setExpanded(prev => ({ ...prev, [day.date]: !isOpen }))}
                className="flex w-full items-center gap-2.5 px-5 py-4 text-left transition-colors hover:bg-slate-50/60"
                aria-expanded={isOpen}
              >
                <CalendarCheck className={cn('h-5 w-5 shrink-0', day.isToday ? 'text-violet-600' : 'text-slate-400')} />
                <span className={cn('truncate text-sm font-semibold', day.isToday ? 'text-violet-800' : 'text-slate-900')}>
                  {day.label}
                </span>
                {day.isToday && (
                  <Badge variant="outline" className="border-violet-200 bg-violet-100 text-[11px] font-semibold text-violet-700">
                    Today
                  </Badge>
                )}
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[11px] text-slate-600">
                  {day.tasks.length} {day.tasks.length === 1 ? 'task' : 'tasks'}
                </Badge>
                <span className="ml-auto hidden text-xs text-slate-500 sm:inline">{doneCount}/{day.tasks.length} done</span>
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
              </button>

              {isOpen && (
                <CardContent className="space-y-2.5 px-5 pt-1 pb-5">
                  <p className="text-xs text-slate-500 sm:hidden">{doneCount}/{day.tasks.length} done</p>
                  {day.tasks.map(task => {
                    const type = TYPE_META[task.type] ?? TYPE_META.study
                    const TypeIcon = type.icon
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 border-l-4 bg-white p-3.5 transition-colors',
                          PRIORITY_STRIP[task.priority] ?? PRIORITY_STRIP.medium,
                          task.completed && 'bg-slate-50/70'
                        )}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTask(day.date, task)}
                          className="h-5 w-5 rounded-full border-slate-300 data-[state=checked]:border-violet-600"
                          aria-label={task.completed ? `Mark "${task.title}" as pending` : `Mark "${task.title}" as completed`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            'truncate text-sm font-medium',
                            task.completed ? 'text-slate-400 line-through' : 'text-slate-800'
                          )}>
                            {task.title}
                          </p>
                        </div>
                        <Badge variant="outline" className="max-w-40 truncate border-slate-200 bg-slate-50 text-[11px] text-slate-600">
                          {task.subject}
                        </Badge>
                        <Badge variant="outline" className={cn('gap-1 text-[11px]', type.badge)}>
                          <TypeIcon className="h-3 w-3" />
                          {type.label}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {task.duration}
                        </span>
                      </div>
                    )
                  })}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
