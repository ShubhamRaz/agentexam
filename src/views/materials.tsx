'use client'

/* ============================================
   AGENTEXAM — Study Materials view (upload-driven)
   POST /materials/upload responds instantly; the
   AI pipeline (extract → subject detection →
   units/topics → question bank → study plan) runs
   in the BACKGROUND and this view polls
   GET /api/materials every 3s while anything is
   still processing. Files are organized
   CATEGORY-WISE: one card per subject with
   Syllabus / Notes / PYQ / Lab Manual sections.
   ============================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, getToken } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { ApiError } from '@/lib/types'
import type {
  ClassroomSummary,
  Material,
  MaterialType,
  MaterialUploadAccepted,
  Subject,
} from '@/lib/types'
import { formatDate } from '@/lib/helpers'
import { AIBadge, EmptyState, ErrorCard, ViewHeader } from '@/components/app/bits'
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
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/* api-client has no DELETE wrapper — mirror its semantics locally */
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

type CategoryId = MaterialType

interface SubjectGroup {
  id: string
  name: string
  code?: string
  source?: 'own' | 'classroom'
  classroomName?: string | null
  materials: Material[]
}

interface UploadJob {
  id: string
  name: string
  /** server material id once the upload POST is accepted (drives live feedback) */
  materialId?: string
  status: 'queued' | 'uploading' | 'analyzing' | 'done' | 'error'
  /** rotating AI pipeline step index while analyzing in the background */
  stage: number
  startedAt: number
}

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const AUTO_SUBJECT = 'auto'
const NO_CLASSROOM = 'none'

/** poll GET /api/materials at this rate while any material is processing */
const POLL_INTERVAL_MS = 3000
/** safety sweep — drop a queue item that never reached a terminal state */
const JOB_STALE_MS = 240_000

/** animated stages cycled while a file's AI pipeline runs in the background */
const AI_STEPS = [
  'AI analyzing in background…',
  'Extracting text…',
  'Detecting subject…',
  'Generating question bank…',
  'Building study plan…',
]

const UPLOAD_TYPE: Record<MaterialType, string> = {
  syllabus: 'SYLLABUS',
  pyq: 'PYQ',
  notes: 'NOTES',
  lab_manual: 'LAB_MANUAL',
}

/** fixed category order inside every subject card */
const CATEGORY_ORDER: CategoryId[] = ['syllabus', 'notes', 'pyq', 'lab_manual']

const CATEGORY_META: Record<CategoryId, { label: string; selectLabel: string; icon: LucideIcon; tile: string }> = {
  syllabus: { label: '📄 Syllabus', selectLabel: '📄 Syllabus', icon: FileText, tile: 'bg-violet-50 text-violet-600' },
  notes: { label: '📚 Notes', selectLabel: '📚 Notes', icon: BookOpen, tile: 'bg-cyan-50 text-cyan-600' },
  pyq: {
    label: '📋 PYQ (Previous-Year Papers)',
    selectLabel: '📋 PYQ papers',
    icon: ClipboardList,
    tile: 'bg-amber-50 text-amber-600',
  },
  lab_manual: { label: '🧪 Lab Manual', selectLabel: '🧪 Lab Manual', icon: FlaskConical, tile: 'bg-emerald-50 text-emerald-600' },
}

const STAGGER = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4']

const ONBOARDING_TILES: { icon: LucideIcon; title: string; desc: string; tile: string }[] = [
  {
    icon: FileText,
    title: 'Any format',
    desc: 'PDF, DOCX or images — the AI reads them all.',
    tile: 'bg-violet-50 text-violet-600',
  },
  {
    icon: ClipboardList,
    title: 'AI question bank',
    desc: 'PYQ-pattern questions generated from YOUR material.',
    tile: 'bg-amber-50 text-amber-600',
  },
  {
    icon: CalendarCheck,
    title: 'Auto study plan',
    desc: 'A day-wise plan built around your exam date.',
    tile: 'bg-cyan-50 text-cyan-600',
  },
]

function fileCountLabel(n: number): string {
  return n === 1 ? '1 file' : `${n} files`
}

function statusBadge(status: Material['status']) {
  switch (status) {
    case 'processed':
      return (
        <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> AI Analyzed
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700">
          <Loader2 className="h-3 w-3 animate-spin" /> AI analyzing…
        </Badge>
      )
    case 'uploading':
      return (
        <Badge variant="outline" className="gap-1 border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600">
          <Upload className="h-3 w-3" /> Uploading
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-[11px] font-medium text-red-700">
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      )
  }
}

function MaterialsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72 rounded-lg" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl sm:w-2/3" />
    </div>
  )
}

/* ---------- onboarding hero (first-run students/faculty) ---------- */

function OnboardingHero() {
  return (
    <div className="animate-fade-in-up stagger-1 relative overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/90 via-white to-cyan-50/50 p-6 shadow-xs sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-100/60 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-40 w-40 rounded-full bg-cyan-100/60 blur-2xl" />

      <div className="relative">
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
          <Sparkles className="h-3 w-3" /> AI-powered onboarding
        </span>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Start by uploading your syllabus
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Upload your syllabus, notes, previous-year papers or lab manual — AgentExam&apos;s AI will
          build your subjects, generate practice questions and create a personalized study plan.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ONBOARDING_TILES.map(t => (
            <div key={t.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', t.tile)}>
                <t.icon className="h-4 w-4" />
              </div>
              <p className="mt-2.5 text-sm font-semibold text-slate-800">{t.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{t.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center" aria-hidden>
          <div className="flex h-10 w-10 animate-bounce items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-200">
            <ArrowDown className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- material row (inside a category section) ---------- */

function MaterialRow({ mat, busy, onReanalyze, onDelete }: {
  mat: Material
  busy: boolean
  onReanalyze: (mat: Material) => void
  onDelete: (mat: Material) => void
}) {
  const meta = CATEGORY_META[mat.type] ?? CATEGORY_META.notes
  // uploadedByName is only set for OTHER people's uploads (faculty-shared
  // classroom materials) — those cannot be re-analyzed or deleted here.
  const canManage = !mat.uploadedByName
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 transition-shadow hover:shadow-xs sm:p-4">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', meta.tile)}>
        <meta.icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p title={mat.name} className="truncate text-sm font-semibold text-slate-800">
          {mat.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          {mat.size} · {formatDate(mat.uploadDate)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {statusBadge(mat.status)}
          {mat.analysisSummary && (
            <Badge
              variant="outline"
              title={`${mat.analysisSummary.subjectName}: ${mat.analysisSummary.units} units · ${mat.analysisSummary.topics} topics · ${mat.analysisSummary.questions} questions`}
              className="border-emerald-200 bg-emerald-50 text-[11px] font-medium text-emerald-700"
            >
              🤖 {mat.analysisSummary.units}u · {mat.analysisSummary.topics}t ·{' '}
              {mat.analysisSummary.questions}q
            </Badge>
          )}
          {mat.uploadedByName && (
            <Badge
              variant="outline"
              title={`Uploaded by ${mat.uploadedByName}`}
              className="border-violet-200 bg-violet-100 text-[11px] font-medium text-violet-700"
            >
              by {mat.uploadedByName}
            </Badge>
          )}
        </div>
      </div>
      {canManage && (
        <div className="flex shrink-0 items-center gap-1">
          {mat.status === 'failed' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 px-2.5 text-xs font-medium text-violet-600 hover:bg-violet-50 hover:text-violet-700"
              disabled={busy}
              onClick={() => onReanalyze(mat)}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
              Re-analyze
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${mat.name}`}
            onClick={() => onDelete(mat)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

/* ---------- category section (Syllabus / Notes / PYQ / Lab Manual) ---------- */

function CategorySection({ categoryId, materials, reanalyzingId, onReanalyze, onDelete }: {
  categoryId: CategoryId
  materials: Material[]
  reanalyzingId: string | null
  onReanalyze: (mat: Material) => void
  onDelete: (mat: Material) => void
}) {
  const meta = CATEGORY_META[categoryId]
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', meta.tile)}>
          <meta.icon className="h-3.5 w-3.5" />
        </span>
        <h4 className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
          {meta.label}
        </h4>
        <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
          {materials.length}
        </span>
      </div>
      <div className="space-y-2">
        {materials.map(m => (
          <MaterialRow
            key={m.id}
            mat={m}
            busy={reanalyzingId === m.id}
            onReanalyze={onReanalyze}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  )
}

/* ---------- subject card: name + count + category sections ---------- */

function SubjectGroupCard({
  group,
  reanalyzingId,
  onReanalyze,
  onDeleteMaterial,
  onDeleteSubject,
  onUploadForSubject,
  className,
}: {
  group: SubjectGroup
  reanalyzingId: string | null
  onReanalyze: (mat: Material) => void
  onDeleteMaterial: (mat: Material) => void
  onDeleteSubject: (group: SubjectGroup) => void
  onUploadForSubject: (subjectId: string) => void
  className?: string
}) {
  const byCategory: Record<CategoryId, Material[]> = {
    syllabus: [],
    notes: [],
    pyq: [],
    lab_manual: [],
  }
  for (const m of group.materials) byCategory[m.type].push(m)

  return (
    <Card className={cn('animate-fade-in-up shadow-xs', className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 title={group.name} className="truncate text-sm font-bold text-slate-900">
                  {group.name}
                </h3>
                {group.code && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                    {group.code}
                  </span>
                )}
                {group.source === 'classroom' && group.classroomName && (
                  <Badge variant="outline" className="border-violet-200 bg-violet-50 text-[10px] font-medium text-violet-700">
                    {group.classroomName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600"
            >
              {fileCountLabel(group.materials.length)}
            </Badge>
            {group.source !== 'classroom' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title={`Delete subject "${group.name}" and all generated questions`}
                onClick={() => onDeleteSubject(group)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {group.materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-7 px-4 text-center bg-slate-50/50">
            <FolderOpen className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-700">No materials attached</p>
            <p className="mt-0.5 text-[11px] text-slate-400 max-w-sm">
              Upload syllabus or notes to generate question bank and study plans for this subject.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-8 gap-1.5 text-xs font-medium text-violet-700 border-violet-200 hover:bg-violet-50"
              onClick={() => onUploadForSubject(group.id)}
            >
              <Upload className="h-3.5 w-3.5" /> Upload materials
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {CATEGORY_ORDER.filter(cat => byCategory[cat].length > 0).map(cat => (
              <CategorySection
                key={cat}
                categoryId={cat}
                materials={byCategory[cat]}
                reanalyzingId={reanalyzingId}
                onReanalyze={onReanalyze}
                onDelete={onDeleteMaterial}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------- "Detecting subject…" group (subjectId still empty) ---------- */

function DetectingGroupCard({ materials, reanalyzingId, onReanalyze, onDelete }: {
  materials: Material[]
  reanalyzingId: string | null
  onReanalyze: (mat: Material) => void
  onDelete: (mat: Material) => void
}) {
  return (
    <Card className="animate-fade-in-up border-amber-200/70 bg-amber-50/30 shadow-xs">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-500" />
            <h3 className="truncate text-sm font-bold text-slate-900">🔄 Detecting subject…</h3>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-amber-200 bg-amber-50 text-[11px] font-medium text-amber-700"
          >
            {fileCountLabel(materials.length)}
          </Badge>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          The AI reads each file to detect its subject — analyzed files land in their subject card
          below.
        </p>
        <div className="space-y-2">
          {materials.map(m => (
            <MaterialRow
              key={m.id}
              mat={m}
              busy={reanalyzingId === m.id}
              onReanalyze={onReanalyze}
              onDelete={onDelete}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function MaterialsView() {
  const { user } = useAuth()
  const isFaculty = user?.role === 'FACULTY'

  const [materials, setMaterials] = useState<Material[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSubject, setSelectedSubject] = useState<string>(AUTO_SUBJECT)
  const [selectedType, setSelectedType] = useState<MaterialType>('syllabus')
  const [selectedClassroom, setSelectedClassroom] = useState<string>(NO_CLASSROOM)
  const [search, setSearch] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [creating, setCreating] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null)
  const [alsoDeleteSubject, setAlsoDeleteSubject] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<SubjectGroup | null>(null)
  const [deletingSubject, setDeletingSubject] = useState(false)
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  /** last-seen materials snapshot — powers transition toasts in the poller */
  const prevMaterialsRef = useRef<Material[]>([])

  /* keep state + ref in lockstep so the poller can diff statuses */
  const applyMaterials = useCallback((next: Material[]) => {
    prevMaterialsRef.current = next
    setMaterials(next)
  }, [])

  const refreshSubjects = useCallback(async () => {
    try {
      const subs = await api.get<Subject[]>('/subjects')
      setSubjects(subs)
    } catch {
      /* non-fatal — subjects refresh again on the next transition */
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mats, subs] = await Promise.all([
        api.get<Material[]>('/materials'),
        api.get<Subject[]>('/subjects'),
      ])
      applyMaterials(mats)
      setSubjects(subs)
      if (isFaculty) {
        try {
          const rooms = await api.get<ClassroomSummary[]>('/classrooms')
          setClassrooms(rooms)
        } catch {
          setClassrooms([]) // non-fatal — classroom targeting is optional
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load materials')
    } finally {
      setLoading(false)
    }
  }, [isFaculty, applyMaterials])

  useEffect(() => {
    load()
  }, [load])

  /* ---------- live background polling ----------
     While ANY material is `processing`, refetch the list every 3s and
     react to transitions: processed → success toast, failed → warning
     toast + Re-analyze affordance, subjectId gained → refresh subjects. */
  const poll = useCallback(async () => {
    try {
      const mats = await api.get<Material[]>('/materials')
      const prev = prevMaterialsRef.current

      for (const m of mats) {
        const before = prev.find(p => p.id === m.id)
        if (!before || before.status !== 'processing') continue
        if (m.status === 'processed') {
          const sum = m.analysisSummary
          if (sum?.isNewSubject) {
            toast.success(
              `✨ ${sum.subjectName} ready — ${sum.units}u · ${sum.topics}t · ${sum.questions}q generated`
            )
          } else if (sum) {
            toast.success(`Added to ${sum.subjectName} — ${sum.questions} new questions`)
          } else {
            toast.success(`"${m.name}" analyzed`)
          }
        } else if (m.status === 'failed') {
          toast.warning(`"${m.name}" — AI analysis failed`, {
            description: 'Use the Re-analyze button on the material card.',
          })
        }
      }

      // a pending material just got its subject assigned → new subject may exist
      const gainedSubject = mats.some(m => {
        const before = prev.find(p => p.id === m.id)
        return before && before.subjectId === '' && m.subjectId !== ''
      })
      if (gainedSubject) void refreshSubjects()

      applyMaterials(mats)

      // mirror per-file queue feedback for the uploads that triggered this
      setUploadQueue(q =>
        q.map(job => {
          if (job.status !== 'analyzing' || !job.materialId) return job
          const m = mats.find(x => x.id === job.materialId)
          if (m?.status === 'processed') return { ...job, status: 'done' as const }
          if (m?.status === 'failed') return { ...job, status: 'error' as const }
          return job
        })
      )
    } catch {
      /* transient poll failure — the interval keeps trying */
    }
  }, [applyMaterials, refreshSubjects])

  const hasProcessing = materials.some(m => m.status === 'processing')
  useEffect(() => {
    if (!hasProcessing) return
    const t = window.setInterval(() => {
      void poll()
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(t)
  }, [hasProcessing, poll])

  /* rotate the animated AI step labels while files analyze in the background */
  const anyAnalyzing = uploadQueue.some(u => u.status === 'analyzing')
  useEffect(() => {
    if (!anyAnalyzing) return
    const t = window.setInterval(() => {
      setUploadQueue(q =>
        q
          .filter(u => !(u.status === 'analyzing' && Date.now() - u.startedAt > JOB_STALE_MS))
          .map(u => (u.status === 'analyzing' ? { ...u, stage: (u.stage + 1) % AI_STEPS.length } : u))
      )
    }, 5000)
    return () => window.clearInterval(t)
  }, [anyAnalyzing])

  /* fade the per-file queue out once every job reached a terminal state */
  const queueSettled =
    uploadQueue.length > 0 && uploadQueue.every(u => u.status === 'done' || u.status === 'error')
  useEffect(() => {
    if (!queueSettled) return
    const t = window.setTimeout(() => setUploadQueue([]), 3500)
    return () => window.clearTimeout(t)
  }, [queueSettled])

  /* ---------- upload (drag & drop + browse, strictly sequential) ---------- */

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList)
      if (files.length === 0) return

      const tooBig = files.filter(f => f.size > MAX_SIZE)
      const valid = files.filter(f => f.size <= MAX_SIZE)
      if (tooBig.length > 0) {
        toast.error(
          tooBig.length === 1
            ? `"${tooBig[0]!.name}" exceeds the 10MB limit`
            : `${tooBig.length} files exceed the 10MB limit`
        )
      }
      if (valid.length === 0) return

      const materialType = UPLOAD_TYPE[selectedType]
      const jobs: UploadJob[] = valid.map(f => ({
        id: crypto.randomUUID(),
        name: f.name,
        status: 'queued' as const,
        stage: 0,
        startedAt: Date.now(),
      }))
      setUploadQueue(q => [...q, ...jobs])

      let ok = 0
      // one at a time — the backend runs a concurrency-limited AI queue
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i]!
        const job = jobs[i]!
        setUploadQueue(q => q.map(u => (u.id === job.id ? { ...u, status: 'uploading' } : u)))
        try {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('material_type', materialType)
          if (selectedSubject !== AUTO_SUBJECT) fd.append('subject_id', selectedSubject)
          if (isFaculty && selectedClassroom !== NO_CLASSROOM) {
            fd.append('classroom_id', selectedClassroom)
          }
          const res = await api.upload<MaterialUploadAccepted>('/materials/upload', fd)
          ok++
          // the accepted material shows up under "Detecting subject…" right away
          const optimistic: Material = { ...res.material }
          delete optimistic.uploadedByName // always the current user's own upload
          applyMaterials([optimistic, ...prevMaterialsRef.current])
          setUploadQueue(q =>
            q.map(u => (u.id === job.id ? { ...u, status: 'analyzing', materialId: res.material.id } : u))
          )
          toast.success(`"${file.name}" uploaded — AI is analyzing it in the background`)
        } catch (err) {
          setUploadQueue(q => q.map(u => (u.id === job.id ? { ...u, status: 'error' } : u)))
          toast.error(`"${file.name}" failed: ${err instanceof Error ? err.message : 'upload error'}`)
        }
      }

      if (ok > 0) {
        // settle: one fresh materials+subjects pass (the poller takes over from here)
        try {
          await poll()
          await refreshSubjects()
        } catch {
          /* keep current list on refresh failure */
        }
      }
    },
    [selectedSubject, selectedClassroom, selectedType, isFaculty, applyMaterials, poll, refreshSubjects]
  )

  /* ---------- re-analyze failed materials ---------- */

  const reanalyze = async (mat: Material) => {
    setReanalyzingId(mat.id)
    try {
      await api.post<{ ok: boolean; queued: boolean }>(`/materials/${mat.id}/reprocess`)
      applyMaterials(
        prevMaterialsRef.current.map(m =>
          m.id === mat.id ? { ...m, status: 'processing' as const, analysisSummary: null } : m
        )
      )
      // status flip restarts the live polling automatically
      toast.success(`Re-analyzing "${mat.name}" — results land in ~20–60s`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to re-analyze material')
    } finally {
      setReanalyzingId(null)
    }
  }

  /* ---------- delete subject (with confirm) ---------- */

  const confirmDeleteSubject = async () => {
    if (!deleteSubjectTarget) return
    setDeletingSubject(true)
    try {
      await apiDelete(`/subjects/${deleteSubjectTarget.id}`)
      setSubjects(prev => prev.filter(s => s.id !== deleteSubjectTarget.id))
      applyMaterials(prevMaterialsRef.current.filter(m => m.subjectId !== deleteSubjectTarget.id))
      setUploadQueue(q =>
        q.filter(u => {
          const mat = materials.find(m => m.id === u.materialId)
          return mat ? mat.subjectId !== deleteSubjectTarget.id : true
        })
      )
      if (selectedSubject === deleteSubjectTarget.id) {
        setSelectedSubject(AUTO_SUBJECT)
      }
      toast.success(`Subject "${deleteSubjectTarget.name}" and all questions deleted`)
      setDeleteSubjectTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete subject')
    } finally {
      setDeletingSubject(false)
    }
  }

  /* ---------- delete material (with confirm) ---------- */

  const handleDeleteMaterialClick = (mat: Material) => {
    setDeleteTarget(mat)
    const count = materials.filter(m => m.subjectId === mat.subjectId).length
    setAlsoDeleteSubject(count <= 1)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (alsoDeleteSubject && deleteTarget.subjectId) {
        await apiDelete(`/subjects/${deleteTarget.subjectId}`)
        setSubjects(prev => prev.filter(s => s.id !== deleteTarget.subjectId))
        applyMaterials(prevMaterialsRef.current.filter(m => m.subjectId !== deleteTarget.subjectId))
        if (selectedSubject === deleteTarget.subjectId) {
          setSelectedSubject(AUTO_SUBJECT)
        }
        toast.success(`Deleted file and subject "${deleteTarget.subject}"`)
      } else {
        await apiDelete(`/materials/${deleteTarget.id}`)
        applyMaterials(prevMaterialsRef.current.filter(m => m.id !== deleteTarget.id))
        setUploadQueue(q => q.filter(u => u.materialId !== deleteTarget.id))
        toast.success(`"${deleteTarget.name}" deleted`)
        void refreshSubjects()
      }
      setDeleteTarget(null)
      setAlsoDeleteSubject(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete material')
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- subject creation (manual, secondary) ---------- */

  const createSubject = async () => {
    const name = newSubjectName.trim()
    if (!name) {
      toast.error('Enter a subject name')
      return
    }
    setCreating(true)
    try {
      const sub = await api.post<Subject>('/subjects', { name })
      setSubjects(prev => [...prev, sub].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedSubject(sub.id)
      setDialogOpen(false)
      setNewSubjectName('')
      toast.success(`Subject "${sub.name}" created`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create subject')
    } finally {
      setCreating(false)
    }
  }

  /* ---------- derived ---------- */

  if (loading) return <div className="animate-fade-in-up"><MaterialsSkeleton /></div>
  if (error) {
    return (
      <div className="animate-fade-in-up">
        <ViewHeader title="Study Materials" subtitle="Upload and manage your study files" />
        <ErrorCard message={error} onRetry={load} />
      </div>
    )
  }

  const onboarding = materials.length === 0 && subjects.length === 0

  const searchLower = search.trim().toLowerCase()
  const visibleMats = searchLower
    ? materials.filter(m => m.name.toLowerCase().includes(searchLower))
    : materials

  // still-detecting files (subjectId '') get their own pinned group on top
  const detecting = visibleMats.filter(m => m.subjectId === '')

  // group the rest per subject — materials arrive newest-first, so groups
  // order themselves by most recent activity
  const groupIndex = new Map<string, SubjectGroup>()
  const subjectGroups: SubjectGroup[] = []
  for (const m of visibleMats) {
    if (!m.subjectId) continue
    let group = groupIndex.get(m.subjectId)
    if (!group) {
      const sub = subjects.find(s => s.id === m.subjectId)
      group = {
        id: m.subjectId,
        name: sub?.name ?? m.subject,
        code: sub?.code,
        source: sub?.source,
        classroomName: sub?.classroomName,
        materials: [],
      }
      groupIndex.set(m.subjectId, group)
      subjectGroups.push(group)
    }
    group.materials.push(m)
  }

  // Also include all visible subjects that have 0 materials currently
  for (const s of subjects) {
    if (!groupIndex.has(s.id)) {
      if (searchLower && !s.name.toLowerCase().includes(searchLower)) continue
      const emptyGroup: SubjectGroup = {
        id: s.id,
        name: s.name,
        code: s.code,
        source: s.source,
        classroomName: s.classroomName,
        materials: [],
      }
      groupIndex.set(s.id, emptyGroup)
      subjectGroups.push(emptyGroup)
    }
  }

  const deleteTargetSubject = deleteTarget?.subjectId
    ? subjects.find(s => s.id === deleteTarget.subjectId)
    : null
  const deleteTargetSubjectMats = deleteTarget?.subjectId
    ? materials.filter(m => m.subjectId === deleteTarget.subjectId)
    : []
  const isOnlyMaterial = deleteTargetSubjectMats.length <= 1

  const handleUploadForSubject = (subjectId: string) => {
    setSelectedSubject(subjectId)
    toast.info('Subject selected. Drop your file in the upload zone above.')
    fileInputRef.current?.click()
  }

  const anyUploading = uploadQueue.some(u => u.status === 'uploading' || u.status === 'queued')
  const zoneBusy = anyUploading || anyAnalyzing

  return (
    <div className="animate-fade-in-up space-y-6">
      <ViewHeader
        title="Study Materials"
        subtitle="Drop a file and the AI builds the subject, question bank and your study plan"
      >
        <AIBadge label="AI Analyzed" />
      </ViewHeader>

      {/* onboarding hero — first run, nothing uploaded yet */}
      {onboarding && <OnboardingHero />}

      {/* Upload target row — hidden for students in onboarding (auto-detect is the flow) */}
      {(!onboarding || isFaculty) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div className="w-full sm:w-56">
            <Label htmlFor="upload-subject" className="text-xs font-medium text-slate-500">
              Subject
            </Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger id="upload-subject" className="mt-1.5 w-full bg-white">
                <SelectValue placeholder="Choose a subject…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO_SUBJECT} className="font-medium">
                  ✨ Auto-detect from file (AI)
                </SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-44">
            <Label htmlFor="upload-type" className="text-xs font-medium text-slate-500">
              Material type
            </Label>
            <Select value={selectedType} onValueChange={v => setSelectedType(v as MaterialType)}>
              <SelectTrigger id="upload-type" className="mt-1.5 w-full bg-white">
                <SelectValue placeholder="Choose a type…" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_ORDER.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_META[cat].selectLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isFaculty && (
            <div className="w-full sm:w-56">
              <Label htmlFor="upload-classroom" className="text-xs font-medium text-slate-500">
                Upload into classroom
              </Label>
              {classrooms.length > 0 ? (
                <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
                  <SelectTrigger id="upload-classroom" className="mt-1.5 w-full bg-white">
                    <SelectValue placeholder="Choose a classroom…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLASSROOM}>Not shared (personal)</SelectItem>
                    {classrooms.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-1.5 flex h-9 items-center gap-1.5 text-xs text-slate-400">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  Create a classroom to share materials with students
                </p>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 text-xs text-slate-500 hover:text-violet-700"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add subject manually
          </Button>
        </div>
      )}

      {/* Drag & drop upload zone — the primary interaction */}
      <div>
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload study materials"
          onClick={() => {
            if (!anyUploading) fileInputRef.current?.click()
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!anyUploading) fileInputRef.current?.click()
            }
          }}
          onDragOver={e => {
            e.preventDefault()
            e.stopPropagation()
            setDragOver(true)
          }}
          onDragLeave={e => {
            e.preventDefault()
            e.stopPropagation()
            setDragOver(false)
          }}
          onDrop={e => {
            e.preventDefault()
            e.stopPropagation()
            setDragOver(false)
            // keep batches strictly sequential — a drop during an active
            // batch would start parallel POSTs (the AI queue 429s)
            if (!anyUploading) void handleFiles(e.dataTransfer.files)
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-6 py-10 text-center outline-none transition-all focus-visible:ring-2 focus-visible:ring-violet-300',
            dragOver
              ? 'scale-[1.01] border-violet-500 bg-violet-50/70'
              : 'border-slate-300 bg-white hover:border-violet-400 hover:bg-violet-50/40'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept=".pdf,.doc,.docx,.jpg,.png"
            onChange={e => {
              if (e.target.files && e.target.files.length > 0) void handleFiles(e.target.files)
              e.target.value = '' // allow re-picking the same file
            }}
          />
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
              dragOver ? 'bg-violet-100 text-violet-600' : 'bg-violet-50 text-violet-500'
            )}
          >
            {zoneBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            {anyUploading
              ? 'Uploading your files…'
              : anyAnalyzing
                ? 'AI is analyzing your files…'
                : 'Upload Study Materials'}
          </h3>
          <p className="text-xs text-slate-500">
            Drag &amp; drop files or click to browse · PDF, DOC, Images · Max 10MB each
          </p>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Drop multiple files — they upload one-by-one and the AI analyzes each in the background
          (~20-60s).
        </p>

        {/* per-file upload + background-analysis progress */}
        {uploadQueue.length > 0 && (
          <div className="mt-3 space-y-2 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
            {uploadQueue.map(job => (
              <div key={job.id} className="flex items-center gap-2.5 text-sm">
                {job.status === 'queued' && <Clock className="h-4 w-4 shrink-0 text-slate-400" />}
                {(job.status === 'uploading' || job.status === 'analyzing') && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-600" />
                )}
                {job.status === 'done' && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                )}
                {job.status === 'error' && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                <span className="min-w-0 flex-1 truncate text-slate-700">{job.name}</span>
                <span
                  className={cn(
                    'shrink-0 text-xs font-medium',
                    job.status === 'queued' && 'text-slate-400',
                    job.status === 'uploading' && 'text-violet-600',
                    job.status === 'analyzing' && 'text-violet-600',
                    job.status === 'done' && 'text-emerald-600',
                    job.status === 'error' && 'text-red-600'
                  )}
                >
                  {job.status === 'queued'
                    ? 'Queued…'
                    : job.status === 'uploading'
                      ? 'Uploading…'
                      : job.status === 'analyzing'
                        ? AI_STEPS[job.stage]
                        : job.status === 'done'
                          ? 'Analyzed'
                          : 'Upload failed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Counts + search — only meaningful once something exists */}
      {!onboarding && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-slate-500">
              {search.trim()
                ? `${visibleMats.length} of ${materials.length} ${materials.length === 1 ? 'file' : 'files'}`
                : `${fileCountLabel(materials.length)} across ${subjectGroups.length} ${
                    subjectGroups.length === 1 ? 'subject' : 'subjects'
                  }${detecting.length > 0 ? ` · ${detecting.length} detecting` : ''}`}
            </p>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search materials…"
                className="h-9 bg-white pl-9 text-sm"
              />
            </div>
          </div>

          {/* Category-wise materials: Detecting group + one card per subject */}
          <div className="ae-scroll max-h-[560px] space-y-4 overflow-y-auto pr-1">
            {detecting.length > 0 && (
              <DetectingGroupCard
                materials={detecting}
                reanalyzingId={reanalyzingId}
                onReanalyze={mat => void reanalyze(mat)}
                onDelete={handleDeleteMaterialClick}
              />
            )}
            {subjectGroups.map((group, i) => (
              <SubjectGroupCard
                key={group.id}
                group={group}
                className={STAGGER[i % STAGGER.length]}
                reanalyzingId={reanalyzingId}
                onReanalyze={mat => void reanalyze(mat)}
                onDeleteMaterial={handleDeleteMaterialClick}
                onDeleteSubject={setDeleteSubjectTarget}
                onUploadForSubject={handleUploadForSubject}
              />
            ))}
            {subjectGroups.length === 0 && detecting.length === 0 && (
              <EmptyState
                icon={FolderOpen}
                title={search.trim() ? 'No materials match your search' : 'No materials yet'}
                message={
                  search.trim()
                    ? `Nothing matches "${search.trim()}".`
                    : 'Drop files in the upload zone — the AI organizes them per subject and category.'
                }
              />
            )}
          </div>
        </>
      )}

      {/* Add subject dialog (manual, rarely needed) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Subject Manually</DialogTitle>
            <DialogDescription>
              Usually unnecessary — the AI auto-detects subjects from your uploads. Use this only
              for a subject with no files yet.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault()
              void createSubject()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-subject">Subject name</Label>
              <Input
                id="new-subject"
                autoFocus
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                placeholder="e.g. Machine Learning"
                className="h-10"
                maxLength={80}
              />
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
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {creating ? 'Creating…' : 'Create Subject'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete material confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={open => {
          if (!open) {
            setDeleteTarget(null)
            setAlsoDeleteSubject(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this material?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-xs">
              <span className="block text-slate-600">
                &quot;{deleteTarget?.name}&quot; and its stored file will be permanently removed.
              </span>
              {isOnlyMaterial && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-2">
                  <p className="font-semibold text-amber-800">
                    ⚠️ This is the only material for &quot;{deleteTargetSubject?.name ?? deleteTarget?.subject}&quot;.
                  </p>
                  <label className="flex items-start gap-2.5 cursor-pointer text-slate-800 pt-1">
                    <Checkbox
                      checked={alsoDeleteSubject}
                      onCheckedChange={checked => setAlsoDeleteSubject(!!checked)}
                      className="mt-0.5 border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                    />
                    <div className="space-y-0.5 leading-snug">
                      <span className="font-semibold text-xs">Also delete subject and all questions from exams</span>
                      <p className="text-[11px] text-slate-500 font-normal">
                        Removes this subject from Theory Exam, Practical Exam, PYQ Analysis, and Syllabus Analysis.
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleting}
              onClick={e => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleting
                ? 'Deleting…'
                : alsoDeleteSubject
                  ? 'Delete File & Subject'
                  : 'Delete File'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete subject confirmation */}
      <AlertDialog
        open={deleteSubjectTarget !== null}
        onOpenChange={open => {
          if (!open) setDeleteSubjectTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subject &quot;{deleteSubjectTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs">
              <span className="block text-slate-600">
                This will permanently delete <strong>{deleteSubjectTarget?.name}</strong> along with all
                its uploaded materials ({deleteSubjectTarget?.materials.length || 0} files), generated
                units, topics, question bank, and exam records.
              </span>
              <span className="block font-medium text-red-600">
                This subject will be completely removed everywhere: Exams, PYQ Analysis, and Syllabus Analysis.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSubject}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deletingSubject}
              onClick={e => {
                e.preventDefault()
                void confirmDeleteSubject()
              }}
            >
              {deletingSubject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deletingSubject ? 'Deleting Subject…' : 'Delete Subject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default MaterialsView
