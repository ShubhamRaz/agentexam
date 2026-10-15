'use client'

/* ============================================
   AGENTEXAM — Faculty Dashboard view
   Classrooms hub for faculty: aggregate stats,
   classroom cards, quick actions, activity feed.
   ============================================ */

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Copy,
  FileStack,
  GraduationCap,
  Plus,
  School,
  Upload,
  UserPlus,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type { ClassroomSummary, FacultyDashboardData, ViewId } from '@/lib/types'
import { formatDate, getGreeting, timeAgo } from '@/lib/helpers'
import {
  AIBadge,
  ErrorCard,
  SectionCard,
  StatCard,
  ViewHeader,
} from '@/components/app/bits'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/* ---------- helpers ---------- */

/** "Dr. Meera Krishnan" → "Dr. Krishnan"; "Meera Krishnan" → "Krishnan" */
function greetingName(facultyName: string): string {
  const parts = facultyName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Professor'
  const last = parts[parts.length - 1]!
  const first = parts[0]!.replace(/\.$/, '')
  return /^(dr|prof|professor)$/i.test(first) && parts.length > 1
    ? `${first}. ${last}`
    : last
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const ACTIVITY_META: { match: (id: string) => boolean; icon: LucideIcon; tile: string }[] = [
  { match: id => id.startsWith('test-'), icon: ClipboardCheck, tile: 'bg-violet-50 text-violet-600' },
  { match: id => id.startsWith('material-'), icon: FileStack, tile: 'bg-amber-50 text-amber-600' },
  { match: id => id.startsWith('enroll-'), icon: UserPlus, tile: 'bg-emerald-50 text-emerald-600' },
]

function activityIcon(id: string): { icon: LucideIcon; tile: string } {
  return ACTIVITY_META.find(a => a.match(id)) ?? { icon: ClipboardCheck, tile: 'bg-slate-100 text-slate-500' }
}

const ONBOARDING_STEPS: { title: string; desc: string; icon: LucideIcon }[] = [
  { title: 'Create a classroom', desc: 'Name it once — you instantly get a join code to share.', icon: School },
  { title: 'Add students by email', desc: 'New accounts are created with a temporary password.', icon: UserPlus },
  { title: 'Upload syllabus & materials', desc: 'AI extracts units, topics and builds a question bank.', icon: Upload },
  { title: 'Conduct tests & track progress', desc: 'Assign a test to the whole class in one click.', icon: Zap },
]

/* ---------- skeleton ---------- */

function FacultyDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map(i => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

/* ---------- view ---------- */

export function FacultyDashboardView({ onNavigate, onOpenClassroom }: {
  onNavigate: (v: ViewId) => void
  onOpenClassroom: (classroomId: string) => void
}) {
  const [data, setData] = useState<FacultyDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  // new classroom dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.get<FacultyDashboardData>('/faculty/dashboard')
      .then(d => { if (!cancelled) setData(d) })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load faculty dashboard')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadTick])

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadTick(t => t + 1)
  }, [])

  const copyCode = useCallback(async (code: string) => {
    const ok = await copyText(code)
    if (ok) toast.success('Classroom code copied', { description: code })
    else toast.error('Could not copy the code')
  }, [])

  const createClassroom = useCallback(async () => {
    const name = newName.trim()
    if (!name) {
      toast.error('Enter a classroom name')
      return
    }
    setCreating(true)
    try {
      const cls = await api.post<ClassroomSummary>('/classrooms', { name })
      setDialogOpen(false)
      setNewName('')
      toast.success(`Classroom "${cls.name}" created`, { description: `Join code: ${cls.code}` })
      onOpenClassroom(cls.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create classroom')
    } finally {
      setCreating(false)
    }
  }, [newName, onOpenClassroom])

  if (loading) return <div className="animate-fade-in-up"><FacultyDashboardSkeleton /></div>
  if (error || !data) {
    return (
      <div className="animate-fade-in-up">
        <ViewHeader title="Faculty Dashboard" subtitle="Your classrooms, students and test analytics" />
        <ErrorCard message={error ?? 'Unknown error'} onRetry={retry} />
      </div>
    )
  }

  const { stats, classrooms, recentActivity } = data

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Greeting */}
      <ViewHeader
        title={`${getGreeting()}, ${greetingName(data.facultyName)} 👋`}
        subtitle="Manage your classrooms, share materials and track how your students are doing."
      >
        <div className="flex items-center gap-3">
          <AIBadge label="AI-assisted course hub" />
          <Button
            className="bg-violet-600 font-semibold hover:bg-violet-700"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Classroom
          </Button>
        </div>
      </ViewHeader>

      {/* Stats row */}
      <div className="animate-fade-in-up stagger-1 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label="Students"
          value={stats.students}
          iconClassName="bg-violet-50 text-violet-600"
        />
        <StatCard
          icon={BookOpen}
          label="Subjects"
          value={stats.subjects}
          iconClassName="bg-cyan-50 text-cyan-600"
        />
        <StatCard
          icon={FileStack}
          label="Materials"
          value={stats.materials}
          iconClassName="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Avg. Score"
          value={stats.averageScore != null ? `${stats.averageScore}%` : '—'}
          change={stats.testsConducted > 0 ? `${stats.testsConducted} ${stats.testsConducted === 1 ? 'test' : 'tests'} conducted` : undefined}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
      </div>

      {classrooms.length === 0 ? (
        /* ---------- empty state: first classroom onboarding ---------- */
        <Card className="animate-fade-in-up stagger-2 border-violet-100 shadow-xs">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <School className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">Create your first classroom 👋</h3>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
              A classroom is where everything comes together — you upload the syllabus and
              materials, AI builds the question bank, students join with your code, and you
              conduct tests and watch their progress.
            </p>
            <ol className="mt-8 grid w-full max-w-3xl gap-4 text-left sm:grid-cols-2 xl:grid-cols-4">
              {ONBOARDING_STEPS.map((step, i) => (
                <li key={step.title} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <step.icon className="h-4 w-4 text-violet-500" />
                  </div>
                  <p className="mt-2.5 text-sm font-semibold text-slate-800">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.desc}</p>
                </li>
              ))}
            </ol>
            <Button
              className="mt-8 bg-violet-600 font-semibold hover:bg-violet-700"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              New Classroom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Classroom cards */}
          <div className="animate-fade-in-up stagger-2 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {classrooms.map(c => (
              <Card
                key={c.id}
                className="group cursor-pointer animate-fade-in-up shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => onOpenClassroom(c.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-violet-700">
                        {c.name}
                      </p>
                      <code className="mt-1.5 inline-block rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-slate-600">
                        {c.code}
                      </code>
                    </div>
                    <button
                      type="button"
                      title={`Copy join code ${c.code}`}
                      aria-label={`Copy join code ${c.code}`}
                      onClick={e => {
                        e.stopPropagation()
                        void copyCode(c.code)
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-violet-50/70 px-2.5 py-2 text-center">
                      <p className="text-base font-bold tabular-nums text-violet-700">{c.studentCount}</p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">Students</p>
                    </div>
                    <div className="rounded-lg bg-cyan-50/70 px-2.5 py-2 text-center">
                      <p className="text-base font-bold tabular-nums text-cyan-700">{c.subjectCount}</p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-cyan-600">Subjects</p>
                    </div>
                    <div className="rounded-lg bg-amber-50/70 px-2.5 py-2 text-center">
                      <p className="text-base font-bold tabular-nums text-amber-700">{c.materialCount}</p>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-amber-600">Materials</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Created {formatDate(c.createdAt)}</span>
                    <span className="flex items-center gap-1 text-xs font-medium text-violet-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick action + recent activity */}
          <div className="animate-fade-in-up stagger-3 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => classrooms[0] && onOpenClassroom(classrooms[0].id)}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/40 p-5 text-left transition-all hover:border-violet-400 hover:bg-violet-50/70"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-violet-900">Conduct a test</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-violet-600">
                    Assign tests to a whole class in one click
                  </p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-violet-400" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('materials')}
                className="hidden w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-xs transition-all hover:border-violet-200 hover:shadow-md lg:flex"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Upload materials</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    Syllabus, PYQs, notes & lab manuals
                  </p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
              </button>
            </div>

            <SectionCard title="Recent Activity" contentClassName="p-0" className="lg:col-span-2">
              {recentActivity.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                  No activity yet — it will show up here as students work.
                </div>
              ) : (
                <ul className="max-h-96 ae-scroll overflow-y-auto">
                  {recentActivity.map(a => {
                    const meta = activityIcon(a.id)
                    return (
                      <li
                        key={a.id}
                        className="flex items-center gap-4 border-b border-slate-100 px-5 py-3.5 last:border-b-0 transition-colors hover:bg-slate-50/60"
                      >
                        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.tile)}>
                          <meta.icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{a.title}</p>
                          <p className="truncate text-xs text-slate-400">{a.detail}</p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-400">{timeAgo(a.time)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}

      {/* New classroom dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Classroom</DialogTitle>
            <DialogDescription>
              Name your class — a join code is generated automatically for students.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault()
              void createClassroom()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="classroom-name">Classroom name</Label>
              <Input
                id="classroom-name"
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. CSE-A Semester 5"
                className="h-10"
                maxLength={80}
              />
              <p className="text-xs text-slate-400">
                Tip: include the section and semester so students recognize it instantly.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="bg-violet-600 hover:bg-violet-700">
                {creating ? 'Creating…' : 'Create Classroom'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FacultyDashboardView
