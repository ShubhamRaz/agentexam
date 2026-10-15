'use client'

/* ============================================
   AGENTEXAM — Classroom detail view (faculty)
   Tabs: Students · Materials & Subjects · Tests
   ============================================ */

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Copy,
  FileStack,
  FileText,
  FlaskConical,
  Layers,
  ListTree,
  Loader2,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, getToken } from '@/lib/api-client'
import { ApiError } from '@/lib/types'
import type {
  ClassroomDetail,
  ClassroomStudentRow,
  ClassroomSubjectRow,
  ConductedTestRow,
  ConductedTestStudentRow,
  Material,
  MaterialType,
  ViewId,
} from '@/lib/types'
import { formatDate, formatDuration, getScoreColor, initials, timeAgo } from '@/lib/helpers'
import { EmptyState, ErrorCard, ScorePill, SectionCard } from '@/components/app/bits'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

/* ---------- small helpers ---------- */

/** DELETE via fetch — mirrors api-client (which has no delete wrapper). */
async function apiDelete(path: string): Promise<void> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api${path}`, { method: 'DELETE', headers })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = (await res.json()) as { error?: string; message?: string }
      message = data.error || data.message || message
    } catch { /* ignore parse errors */ }
    throw new ApiError(message, res.status)
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const MATERIAL_META: Record<MaterialType, { icon: LucideIcon; tile: string }> = {
  syllabus: { icon: FileText, tile: 'bg-violet-50 text-violet-600' },
  pyq: { icon: ClipboardList, tile: 'bg-amber-50 text-amber-600' },
  notes: { icon: BookOpen, tile: 'bg-cyan-50 text-cyan-600' },
  lab_manual: { icon: FlaskConical, tile: 'bg-emerald-50 text-emerald-600' },
}

const TEST_STATUS_META: Record<ConductedTestStudentRow['status'], { label: string; badge: string }> = {
  not_started: { label: 'Pending', badge: 'border-slate-200 bg-slate-50 text-slate-600' },
  in_progress: { label: 'In Progress', badge: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
  submitted: { label: 'Grading', badge: 'border-amber-200 bg-amber-50 text-amber-700' },
  evaluated: { label: 'Evaluated', badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
}

function materialStatusBadge(status: Material['status']) {
  switch (status) {
    case 'processed':
      return (
        <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> Analyzed
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700">
          <Loader2 className="h-3 w-3 animate-spin" /> Processing
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500">
          {status === 'uploading' ? 'Uploading' : 'Failed'}
        </Badge>
      )
  }
}

/** amber within 3 days, red when overdue */
function dueDateClass(due: string): string {
  const daysLeft = (new Date(due).getTime() - Date.now()) / 86_400_000
  if (daysLeft < 0) return 'font-semibold text-red-600'
  if (daysLeft <= 3) return 'font-semibold text-amber-600'
  return 'text-slate-500'
}

/* ---------- skeletons ---------- */

function ClassroomSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-44" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  )
}

/* ---------- sub-components ---------- */

function StudentAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <div className={cn(
      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-bold text-white',
      className
    )}>
      {initials(name)}
    </div>
  )
}

function AddStudentDialog({ open, onOpenChange, classroomId, onAdded }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  classroomId: string
  onAdded: () => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  const submit = async () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      toast.error('Enter a student email')
      return
    }
    setAdding(true)
    try {
      const res = await api.post<{ student: ClassroomStudentRow; tempPassword: string | null }>(
        `/classrooms/${classroomId}/students`,
        { email: trimmedEmail, name: name.trim() || undefined }
      )
      toast.success(`Student added — ${res.student.name}`, {
        description: res.tempPassword ? `Temporary password: ${res.tempPassword}` : undefined,
      })
      setEmail('')
      setName('')
      onOpenChange(false)
      onAdded()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add student')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Student</DialogTitle>
          <DialogDescription>
            Enroll an existing student or invite a new one by email.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="student-email">Student email</Label>
            <Input
              id="student-email"
              type="email"
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="student@college.edu"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student-name">
              Name <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="student-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Derived from the email when left blank"
              className="h-10"
              maxLength={80}
            />
          </div>
          <p className="rounded-lg bg-violet-50/70 px-3 py-2.5 text-xs leading-relaxed text-violet-700">
            <UserPlus className="mr-1 inline h-3.5 w-3.5" />
            New students get a temporary password (<code className="font-semibold">student123</code>)
            — share it with them so they can log in.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" disabled={adding} className="bg-violet-600 hover:bg-violet-700">
              {adding ? 'Adding…' : 'Add Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConductTestDialog({ open, onOpenChange, classroomId, subjects, nextTestNumber, onConducted }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  classroomId: string
  subjects: ClassroomSubjectRow[]
  nextTestNumber: number
  onConducted: () => void
}) {
  // remounted via `key` on every open — initial values act as per-open defaults
  const [title, setTitle] = useState(`Unit Test ${nextTestNumber}`)
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '')
  const [count, setCount] = useState('8')
  const [duration, setDuration] = useState('30')
  const [dueDate, setDueDate] = useState('')
  const [conducting, setConducting] = useState(false)

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Enter a test title')
      return
    }
    if (!subjectId) {
      toast.error('Select a subject')
      return
    }
    setConducting(true)
    try {
      const res = await api.post<{ conducted: number; question_count: number; total_marks: number; title: string }>(
        `/classrooms/${classroomId}/tests`,
        {
          title: title.trim(),
          subject_id: subjectId,
          question_count: Number(count),
          duration_minutes: Number(duration),
          due_date: dueDate || undefined,
        }
      )
      toast.success(`Test conducted — assigned to ${res.conducted} ${res.conducted === 1 ? 'student' : 'students'}`, {
        description: `${res.question_count} questions · ${res.total_marks} marks`,
      })
      onOpenChange(false)
      onConducted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to conduct test')
    } finally {
      setConducting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conduct Test</DialogTitle>
          <DialogDescription>
            One shared AI-generated paper is assigned to every enrolled student.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="test-title">Title</Label>
            <Input
              id="test-title"
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Unit Test 1"
              className="h-10"
              maxLength={80}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Choose…" />
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
              <Label>Questions</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['5', '8', '10', '12'].map(n => (
                    <SelectItem key={n} value={n}>{n} questions</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['15', '30', '45', '60'].map(m => (
                    <SelectItem key={m} value={m}>{m} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-due">
                Due date <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              <Input
                id="test-due"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="h-10 bg-white"
              />
            </div>
          </div>
          <p className="rounded-lg bg-violet-50/70 px-3 py-2.5 text-xs leading-relaxed text-violet-700">
            <Zap className="mr-1 inline h-3.5 w-3.5" />
            Questions are drawn from the subject&apos;s AI-generated bank — students get the same
            shuffled paper and their answers are auto-graded.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={conducting}>
              Cancel
            </Button>
            <Button type="submit" disabled={conducting} className="bg-violet-600 hover:bg-violet-700">
              {conducting ? 'Conducting…' : 'Conduct Test'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- roster rows ---------- */

function StudentMobileRow({ student, onRemove }: {
  student: ClassroomStudentRow
  onRemove: (s: ClassroomStudentRow) => void
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <StudentAvatar name={student.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{student.name}</p>
        <p className="truncate text-xs text-slate-400">{student.email}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
          <span>Added {formatDate(student.addedAt)}</span>
          <span className="tabular-nums">{student.testsCompleted} {student.testsCompleted === 1 ? 'test' : 'tests'}</span>
          <span>{student.lastActive ? `Active ${timeAgo(student.lastActive)}` : 'Not active yet'}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {student.averageScore != null ? (
          <span className={cn('text-sm font-bold tabular-nums', getScoreColor(student.averageScore))}>
            {student.averageScore}%
          </span>
        ) : (
          <span className="text-xs text-slate-400">No score</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-400 hover:bg-red-50 hover:text-red-600"
          onClick={() => onRemove(student)}
          aria-label={`Remove ${student.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function ConductedTestCard({ test }: { test: ConductedTestRow }) {
  const [open, setOpen] = useState(false)
  const pct = test.total > 0 ? (test.completed / test.total) * 100 : 0

  return (
    <Card className="animate-fade-in-up overflow-hidden py-0 shadow-xs">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full px-5 py-4 text-left transition-colors hover:bg-slate-50/60"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{test.title}</p>
              <Badge variant="outline" className="border-violet-200 bg-violet-50 text-[11px] font-medium text-violet-700">
                {test.subject}
              </Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="tabular-nums">{test.questionCount} questions</span>
              <span>·</span>
              <span className="tabular-nums">{test.totalMarks} marks</span>
              <span>·</span>
              <span>{formatDuration(test.durationMinutes)}</span>
              {test.dueDate && (
                <>
                  <span>·</span>
                  <span className={dueDateClass(test.dueDate)}>Due {formatDate(test.dueDate)}</span>
                </>
              )}
              <span>·</span>
              <span>Conducted {timeAgo(test.createdAt)}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            {test.averageScore != null ? (
              <ScorePill score={test.averageScore} />
            ) : (
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                No scores
              </Badge>
            )}
            <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>{test.completed} of {test.total} completed</span>
            <span className="tabular-nums">{Math.round(pct)}%</span>
          </div>
          <Progress value={pct} className="h-1.5 bg-slate-100" />
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {test.students.map(st => {
                const status = TEST_STATUS_META[st.status]
                return (
                  <TableRow key={st.studentId}>
                    <TableCell className="py-2.5 text-sm font-medium text-slate-700">{st.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[11px] font-medium', status.badge)}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {st.score != null ? (
                        <ScorePill score={st.score} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {st.submittedAt ? timeAgo(st.submittedAt) : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}

/* ---------- main view ---------- */

export function ClassroomView({ classroomId, onNavigate, onBack }: {
  classroomId: string
  onNavigate: (v: ViewId) => void
  onBack: () => void
}) {
  const [detail, setDetail] = useState<ClassroomDetail | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const [tab, setTab] = useState('students')

  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<ClassroomStudentRow | null>(null)
  const [removing, setRemoving] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [testDialogKey, setTestDialogKey] = useState(0)

  const openTestDialog = useCallback(() => {
    setTestDialogKey(k => k + 1)
    setTestOpen(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get<ClassroomDetail>(`/classrooms/${classroomId}`),
      api.get<Material[]>('/materials'),
    ])
      .then(([d, mats]) => {
        if (cancelled) return
        setDetail(d)
        setMaterials(mats)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load classroom')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [classroomId, reloadTick])

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadTick(t => t + 1)
  }, [])

  const silentReload = useCallback(() => {
    setReloadTick(t => t + 1)
  }, [])

  const copyCode = useCallback(async (code: string) => {
    const ok = await copyText(code)
    if (ok) toast.success('Classroom code copied', { description: code })
    else toast.error('Could not copy the code')
  }, [])

  const removeStudent = useCallback(async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await apiDelete(`/classrooms/${classroomId}/students/${removeTarget.id}`)
      toast.success(`Student removed — ${removeTarget.name}`)
      setRemoveTarget(null)
      silentReload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove student')
    } finally {
      setRemoving(false)
    }
  }, [removeTarget, classroomId, silentReload])

  if (loading) return <div className="animate-fade-in-up"><ClassroomSkeleton /></div>
  if (error || !detail) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <div>
          <Button variant="outline" size="sm" className="h-9" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </div>
        <ErrorCard message={error ?? 'Unknown error'} onRetry={retry} />
      </div>
    )
  }

  const subjectIds = new Set(detail.subjects.map(s => s.id))
  const classroomMaterials = materials.filter(m => subjectIds.has(m.subjectId))

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Classroom header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={onBack}
            aria-label="Back to faculty dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{detail.name}</h1>
              <code className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-slate-600">
                {detail.code}
              </code>
              <button
                type="button"
                title={`Copy join code ${detail.code}`}
                aria-label={`Copy join code ${detail.code}`}
                onClick={() => void copyCode(detail.code)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              Led by {detail.facultyName} · {detail.students.length} {detail.students.length === 1 ? 'student' : 'students'} · {detail.subjects.length} {detail.subjects.length === 1 ? 'subject' : 'subjects'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 p-1 sm:w-auto">
          <TabsTrigger
            value="students"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-xs"
          >
            Students
            <span className="ml-1.5 rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
              {detail.students.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="materials"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-xs"
          >
            Materials &amp; Subjects
            <span className="ml-1.5 rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
              {detail.subjects.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="tests"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-xs"
          >
            Tests
            <span className="ml-1.5 rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
              {detail.tests.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ---------- Students tab ---------- */}
        <TabsContent value="students" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-600">
              {detail.students.length} {detail.students.length === 1 ? 'student' : 'students'} enrolled
            </p>
            <Button
              className="h-9 bg-violet-600 font-semibold hover:bg-violet-700"
              onClick={() => setAddOpen(true)}
            >
              <UserPlus className="h-4 w-4" /> Add Student
            </Button>
          </div>
          {detail.students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students yet — add them by email"
              message="Students you add get instant access to this classroom's materials and assigned tests."
              action={
                <Button className="bg-violet-600 font-semibold hover:bg-violet-700" onClick={() => setAddOpen(true)}>
                  <UserPlus className="h-4 w-4" /> Add Student
                </Button>
              }
            />
          ) : (
            <>
              <Card className="hidden shadow-xs md:block">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-5">Student</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead>Tests Completed</TableHead>
                        <TableHead>Avg. Score</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead className="w-14 pr-4" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.students.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="py-3 pl-5">
                            <div className="flex items-center gap-3">
                              <StudentAvatar name={s.name} className="h-8 w-8" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                                <p className="truncate text-xs text-slate-400">{s.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{formatDate(s.addedAt)}</TableCell>
                          <TableCell className="text-sm tabular-nums text-slate-700">{s.testsCompleted}</TableCell>
                          <TableCell>
                            {s.averageScore != null ? (
                              <ScorePill score={s.averageScore} />
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {s.lastActive ? timeAgo(s.lastActive) : '—'}
                          </TableCell>
                          <TableCell className="pr-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() => setRemoveTarget(s)}
                              aria-label={`Remove ${s.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="space-y-3 md:hidden">
                {detail.students.map(s => (
                  <StudentMobileRow key={s.id} student={s} onRemove={setRemoveTarget} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ---------- Materials & Subjects tab ---------- */}
        <TabsContent value="materials" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Subjects */}
            <SectionCard title="Subjects" contentClassName={detail.subjects.length === 0 ? 'p-5' : 'p-0'}>
              {detail.subjects.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No subjects yet — they are created automatically when you upload a syllabus into
                  this classroom.
                </p>
              ) : (
                <ul>
                  {detail.subjects.map(sub => (
                    <li
                      key={sub.id}
                      className="border-b border-slate-100 px-5 py-4 last:border-b-0 transition-colors hover:bg-slate-50/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{sub.name}</p>
                          <code className="mt-1 inline-block rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-slate-600">
                            {sub.code}
                          </code>
                        </div>
                        <Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700">
                          <FileStack className="mr-1 h-3 w-3" /> {sub.materialCount} {sub.materialCount === 1 ? 'material' : 'materials'}
                        </Badge>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700">
                          <Layers className="h-3 w-3" /> {sub.units} {sub.units === 1 ? 'unit' : 'units'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-700">
                          <ListTree className="h-3 w-3" /> {sub.topics} {sub.topics === 1 ? 'topic' : 'topics'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                          <ClipboardCheck className="h-3 w-3" /> {sub.questions} {sub.questions === 1 ? 'question' : 'questions'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            {/* Materials */}
            <div className="space-y-4">
              <SectionCard title="Classroom Materials" contentClassName={classroomMaterials.length === 0 ? 'p-5' : 'p-0'}>
                {classroomMaterials.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No materials in this classroom yet — uploaded syllabi, PYQs, notes and lab
                    manuals will appear here once analyzed.
                  </p>
                ) : (
                  <ul className="max-h-[480px] ae-scroll overflow-y-auto">
                    {classroomMaterials.map(m => {
                      const meta = MATERIAL_META[m.type] ?? MATERIAL_META.notes
                      return (
                        <li
                          key={m.id}
                          className="flex items-center gap-3.5 border-b border-slate-100 px-5 py-3.5 last:border-b-0 transition-colors hover:bg-slate-50/60"
                        >
                          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.tile)}>
                            <meta.icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p title={m.name} className="truncate text-sm font-medium text-slate-800">{m.name}</p>
                            <p className="truncate text-xs text-slate-400">
                              {m.subject} · {m.size}
                              {m.uploadedByName ? ` · ${m.uploadedByName}` : ''} · {formatDate(m.uploadDate)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            {m.analysisSummary && (
                              <Badge variant="outline" className="border-violet-200 bg-violet-50 text-[11px] font-medium text-violet-700">
                                🤖 {m.analysisSummary.units}u · {m.analysisSummary.topics}t · {m.analysisSummary.questions}q
                              </Badge>
                            )}
                            {materialStatusBadge(m.status)}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </SectionCard>

              <button
                type="button"
                onClick={() => onNavigate('materials')}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/40 p-5 text-left transition-all hover:border-violet-400 hover:bg-violet-50/70"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-violet-900">Upload materials</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-violet-600">
                    Syllabus, PYQs, notes &amp; lab manuals — AI extracts units, topics and questions
                  </p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-violet-400" />
              </button>
            </div>
          </div>
        </TabsContent>

        {/* ---------- Tests tab ---------- */}
        <TabsContent value="tests" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-600">
              {detail.tests.length} {detail.tests.length === 1 ? 'test' : 'tests'} conducted
            </p>
            <Button
              className="h-9 bg-violet-600 font-semibold hover:bg-violet-700"
              onClick={openTestDialog}
              disabled={detail.subjects.length === 0 || detail.students.length === 0}
              title={detail.subjects.length === 0 ? 'Upload materials to create a subject first' : detail.students.length === 0 ? 'Add students before conducting a test' : 'Conduct a test for the whole class'}
            >
              <Zap className="h-4 w-4" /> Conduct Test
            </Button>
          </div>
          {detail.tests.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No tests conducted yet"
              message="Conduct a test to assign one AI-generated paper to every student in this classroom."
              action={
                <Button
                  className="bg-violet-600 font-semibold hover:bg-violet-700"
                  onClick={openTestDialog}
                  disabled={detail.subjects.length === 0 || detail.students.length === 0}
                >
                  <Zap className="h-4 w-4" /> Conduct Test
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {detail.tests.map(test => (
                <ConductedTestCard key={test.id} test={test} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add student dialog */}
      <AddStudentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        classroomId={classroomId}
        onAdded={silentReload}
      />

      {/* Conduct test dialog (keyed remount → fresh defaults each open) */}
      <ConductTestDialog
        key={`conduct-${testDialogKey}`}
        open={testOpen}
        onOpenChange={setTestOpen}
        classroomId={classroomId}
        subjects={detail.subjects}
        nextTestNumber={detail.tests.length + 1}
        onConducted={silentReload}
      />

      {/* Remove student confirm */}
      <AlertDialog open={removeTarget != null} onOpenChange={open => { if (!open) setRemoveTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove student?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget && (
                <>
                  <span className="font-medium text-slate-700">{removeTarget.name}</span> ({removeTarget.email})
                  will lose access to this classroom&apos;s materials and assigned tests. Their
                  account and past results are kept.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault()
                void removeStudent()
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {removing ? 'Removing…' : 'Remove Student'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ClassroomView
