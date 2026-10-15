'use client'

/* ============================================
   AGENTEXAM — Dashboard view
   Ported from original Frontend/src/pages/Dashboard.jsx
   ============================================ */

import { useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Flame,
  Sparkles,
  Trophy,
  Upload,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import type { AssignedTest, DashboardData, Subject, ViewId } from '@/lib/types'
import {
  formatDate,
  getGreeting,
  getScoreBarColor,
  getScoreColor,
  getScoreLabel,
  timeAgo,
} from '@/lib/helpers'
import {
  AIBadge,
  ErrorCard,
  ProgressCircle,
  ScorePill,
  SectionCard,
  StatCard,
  ViewHeader,
} from '@/components/app/bits'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
}

const ASSIGNED_STATUS: Record<AssignedTest['status'], { label: string; badge: string }> = {
  DRAFT: { label: 'Pending', badge: 'border-amber-200 bg-amber-50 text-amber-700' },
  IN_PROGRESS: { label: 'In Progress', badge: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
  EVALUATED: { label: 'Evaluated', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
}

/* ---------- skeletons ---------- */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

/* ---------- view ---------- */

export function DashboardView({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [subjects, setSubjects] = useState<Subject[] | null>(null)
  const [assigned, setAssigned] = useState<AssignedTest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // dashboard is the primary payload — subjects/assigned are supplementary
      const [dashRes, subsRes, assignedRes] = await Promise.allSettled([
        api.get<DashboardData>('/dashboard'),
        api.get<Subject[]>('/subjects'),
        api.get<AssignedTest[]>('/exams/assigned'),
      ])
      if (dashRes.status === 'rejected') {
        throw dashRes.reason instanceof Error
          ? dashRes.reason
          : new Error('Failed to load dashboard')
      }
      setData(dashRes.value)
      setSubjects(subsRes.status === 'fulfilled' ? subsRes.value : null)
      setAssigned(assignedRes.status === 'fulfilled' ? assignedRes.value : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleTask = useCallback(
    async (taskId: string, current: boolean) => {
      const next = !current
      // optimistic update
      setData(prev =>
        prev
          ? {
              ...prev,
              todayTasks: prev.todayTasks.map(t =>
                t.id === taskId ? { ...t, completed: next } : t
              ),
            }
          : prev
      )
      try {
        await api.patch(`/study-plan/tasks/${taskId}/status`, {
          status: next ? 'completed' : 'pending',
        })
        toast.success(next ? 'Task completed — nice work!' : 'Task reopened')
      } catch (err) {
        // revert on failure
        setData(prev =>
          prev
            ? {
                ...prev,
                todayTasks: prev.todayTasks.map(t =>
                  t.id === taskId ? { ...t, completed: current } : t
                ),
              }
            : prev
        )
        toast.error(err instanceof Error ? err.message : 'Could not update task')
      }
    },
    []
  )

  if (loading) return <div className="animate-fade-in-up"><DashboardSkeleton /></div>
  if (error || !data) {
    return (
      <div className="animate-fade-in-up">
        <ViewHeader title="Dashboard" subtitle="Your exam prep at a glance" />
        <ErrorCard message={error ?? 'Unknown error'} onRetry={load} />
      </div>
    )
  }

  const { student, readinessScore, daysLeft, recentTests, recentActivity, todayTasks, weakTopics, subjectPerformance } = data
  const firstName = (user?.name ?? student.name ?? 'Student').split(' ')[0] ?? 'Student'
  const completedCount = todayTasks.filter(t => t.completed).length

  /* fresh account — no subjects, no tests, nothing uploaded yet */
  const isFreshUser =
    subjects !== null &&
    subjects.length === 0 &&
    readinessScore === 0 &&
    recentTests.length === 0 &&
    student.testsCompleted === 0

  if (isFreshUser) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader
          title={`${getGreeting()}, ${firstName} 👋`}
          subtitle="Let's set up your AI exam preparation"
        />

        <div className="animate-fade-in-up stagger-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-950 via-violet-700 to-cyan-600 p-6 text-white shadow-md sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-10 h-48 w-48 rounded-full bg-cyan-300/20 blur-2xl" />
          <div className="pointer-events-none absolute right-10 top-10 h-16 w-16 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute right-24 top-24 h-8 w-8 rounded-full bg-white/10" />

          <div className="relative mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
              <Sparkles className="h-3 w-3" /> AI exam preparation
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome to AgentExam 👋
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
              Your AI exam preparation starts with your materials. Upload your syllabus, notes or
              PYQs and we&apos;ll build your complete study plan — subjects, question banks, tests.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-white/80">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur">
                <FileText className="h-3 w-3" /> Any format
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur">
                <ClipboardList className="h-3 w-3" /> AI question bank
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 backdrop-blur">
                <CalendarCheck className="h-3 w-3" /> Auto study plan
              </span>
            </div>

            <Button
              size="lg"
              className="mt-8 h-11 bg-white px-6 text-sm font-semibold text-violet-800 hover:bg-white/90"
              onClick={() => onNavigate('materials')}
            >
              <Upload className="mr-2 h-4 w-4" /> Upload your first material
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // score trend over time from recent evaluated tests (oldest → newest)
  const scoreTrend = [...recentTests]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(t => ({
      date: new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      score: t.score,
    }))

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Greeting */}
      <ViewHeader
        title={`${getGreeting()}, ${firstName} 👋`}
        subtitle={`${daysLeft} days until your exam. Let's make today count!`}
      />

      {/* Readiness hero */}
      <div className="animate-fade-in-up stagger-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-950 via-violet-700 to-cyan-600 p-6 text-white shadow-md sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-10 h-48 w-48 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="pointer-events-none absolute right-10 top-10 h-16 w-16 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute right-24 top-24 h-8 w-8 rounded-full bg-white/10" />

        <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-lg text-center sm:text-left">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
              <Sparkles className="h-3 w-3" />
              Exam Readiness
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {getScoreLabel(readinessScore)}
            </h2>
            <p className="mt-2 text-sm text-white/80">
              You&apos;re making good progress! Focus on weak topics to boost your score.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
              <Button
                size="sm"
                onClick={() => onNavigate('readiness')}
                className="h-9 border border-white/25 bg-white/15 text-white backdrop-blur hover:bg-white/25"
              >
                View Details <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => onNavigate('exam')}
                className="h-9 bg-white text-violet-800 hover:bg-white/90"
              >
                Start Practice <Zap className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
          <ProgressCircle
            value={readinessScore}
            size={160}
            strokeWidth={10}
            color="#FFFFFF"
            trackColor="rgba(255,255,255,0.25)"
            className="shrink-0"
          >
            <span className="text-3xl font-bold text-white">{readinessScore}%</span>
            <span className="mt-0.5 text-[11px] font-medium uppercase tracking-widest text-white/70">
              Ready
            </span>
          </ProgressCircle>
        </div>
      </div>

      {/* Stats row */}
      <div className="animate-fade-in-up stagger-2 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Study Streak"
          value={`${student.streak} days`}
          change="+2 from last week"
          iconClassName="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={Trophy}
          label="Average Score"
          value={`${student.averageScore}%`}
          change="+5% this month"
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={BookOpen}
          label="Tests Completed"
          value={student.testsCompleted}
          iconClassName="bg-violet-50 text-violet-600"
        />
        <StatCard
          icon={Clock}
          label="Study Hours"
          value={`${student.totalStudyHours}h`}
          change="+12h this week"
          iconClassName="bg-cyan-50 text-cyan-600"
        />
      </div>

      {/* Assigned tests from faculty — omitted silently when none */}
      {assigned.length > 0 && (
        <SectionCard
          title="📋 Assigned by your faculty"
          badge={
            <Badge variant="outline" className="bg-violet-50 text-[11px] font-medium text-violet-700">
              {assigned.length} test{assigned.length === 1 ? '' : 's'}
            </Badge>
          }
          contentClassName="p-0"
          className="animate-fade-in-up stagger-2"
        >
          <ul>
            {assigned.map(test => {
              const status = ASSIGNED_STATUS[test.status] ?? ASSIGNED_STATUS.DRAFT
              return (
                <li
                  key={test.id}
                  className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800">{test.title}</p>
                      <Badge variant="outline" className={cn('text-[11px] font-medium', status.badge)}>
                        {status.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {test.subject} · by {test.assignedByName}
                      {test.dueDate && <> · due {formatDate(test.dueDate)}</>}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {test.questionCount} questions · {test.totalMarks} marks ·{' '}
                      {test.durationMinutes} min
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-9 shrink-0 bg-violet-600 text-xs font-semibold hover:bg-violet-700"
                    onClick={() => onNavigate('exam')}
                  >
                    <Zap className="mr-1 h-3.5 w-3.5" /> Start Test
                  </Button>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      )}

      {/* Today's plan + score trend */}
      <div className="animate-fade-in-up stagger-3 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Today's Study Plan"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-violet-600 hover:text-violet-700"
              onClick={() => onNavigate('study-plan')}
            >
              View all <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          }
          contentClassName="p-0"
        >
          <p className="px-5 pt-4 text-xs text-slate-500">
            {completedCount} of {todayTasks.length} tasks completed
          </p>
          {todayTasks.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No tasks for today — generate a study plan to stay on track.
            </div>
          ) : (
            <ul>
              {todayTasks.map(task => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 last:border-b-0 transition-colors hover:bg-slate-50/60"
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id, task.completed)}
                    aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                      task.completed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 text-transparent hover:border-violet-500'
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm font-medium',
                        task.completed ? 'text-slate-400 line-through' : 'text-slate-800'
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="bg-slate-50 text-[11px] text-slate-600">
                        {task.subject}
                      </Badge>
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            PRIORITY_DOT[task.priority] ?? 'bg-slate-400'
                          )}
                        />
                        <span className="capitalize">{task.priority}</span>
                      </span>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    {task.duration}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Score Trend"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-violet-600 hover:text-violet-700"
              onClick={() => onNavigate('performance')}
            >
              Details <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          }
        >
          {scoreTrend.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
              Take a test to see your score trend
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={scoreTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="aeScoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                  tickMargin={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                  domain={[0, 100]}
                  width={42}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                  }}
                  formatter={value => [`${value}%`, 'Score']}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#7C3AED"
                  strokeWidth={2.5}
                  fill="url(#aeScoreGrad)"
                  dot={false}
                  activeDot={{ fill: '#7C3AED', strokeWidth: 2, r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Subject performance + weak topics */}
      <div className="animate-fade-in-up stagger-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Subject Performance"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-violet-600 hover:text-violet-700"
              onClick={() => onNavigate('performance')}
            >
              View detailed analytics <ArrowRight className="ml-0.5 h-3.5 w-3.5" />
            </Button>
          }
        >
          {subjectPerformance.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">
              Complete a test to unlock subject analytics
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {subjectPerformance.map(sub => (
                <div key={sub.subject}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-800">{sub.subject}</span>
                    <span className={cn('shrink-0 text-sm font-semibold', getScoreColor(sub.score))}>
                      {sub.score}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', getScoreBarColor(sub.score))}
                      style={{ width: `${Math.max(2, Math.min(100, sub.score))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {sub.tests} {sub.tests === 1 ? 'test' : 'tests'} · {sub.accuracy}% accuracy
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Weak Topics"
          badge={<AIBadge label="AI Identified" />}
        >
          {weakTopics.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">
              No weak topics detected — keep practicing!
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {weakTopics.map((wt, i) => (
                  <div
                    key={`${wt.topic}-${i}`}
                    className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm font-bold text-red-600">
                      {wt.score}%
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{wt.topic}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{wt.subject}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{wt.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 h-8 text-xs font-semibold text-violet-600 hover:text-violet-700"
                onClick={() => onNavigate('exam')}
              >
                Practice Weak Topics <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </SectionCard>
      </div>

      {/* Recent activity */}
      <SectionCard title="Recent Activity" contentClassName="p-0" className="animate-fade-in-up">
        {recentActivity.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">No activity yet</div>
        ) : (
          <ul>
            {recentActivity.map(activity => (
              <li
                key={activity.id}
                className="flex items-center gap-4 border-b border-slate-100 px-5 py-3.5 last:border-b-0 transition-colors hover:bg-slate-50/60"
              >
                <span className="text-xl" role="img" aria-hidden>
                  {activity.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{activity.title}</p>
                  <p className="text-xs text-slate-400">{timeAgo(activity.time)}</p>
                </div>
                {typeof activity.score === 'number' && <ScorePill score={activity.score} />}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

export default DashboardView
