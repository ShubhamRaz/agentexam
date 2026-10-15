'use client'

/* ============================================
   AGENTEXAM — Study Materials view (upload-driven)
   No subject required: the backend AI pipeline
   auto-detects the subject from the file, builds
   units/topics/questions and regenerates the study
   plan. Faculty can additionally target a classroom.
   ============================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Upload,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import type {
  ClassroomSummary,
  Material,
  MaterialType,
  MaterialUploadResult,
  Subject,
} from '@/lib/types'
import { formatDate } from '@/lib/helpers'
import { AIBadge, EmptyState, ErrorCard, ViewHeader } from '@/components/app/bits'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

type TabId = 'all' | MaterialType

interface UploadJob {
  id: string
  name: string
  status: 'uploading' | 'done' | 'error'
  /** rotating AI pipeline step index (while in flight) */
  stage: number
}

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const AUTO_SUBJECT = 'auto'
const NO_CLASSROOM = 'none'

/** animated steps cycled while a file is in the AI pipeline */
const AI_STEPS = [
  'Extracting text…',
  'AI analyzing syllabus…',
  'Generating question bank…',
  'Building study plan…',
]

const UPLOAD_TYPE: Record<MaterialType, string> = {
  syllabus: 'SYLLABUS',
  pyq: 'PYQ',
  notes: 'NOTES',
  lab_manual: 'LAB_MANUAL',
}

const TYPE_META: Record<MaterialType, { label: string; icon: LucideIcon; tile: string }> = {
  syllabus: { label: 'Syllabus', icon: FileText, tile: 'bg-violet-50 text-violet-600' },
  pyq: { label: 'PYQs', icon: ClipboardList, tile: 'bg-amber-50 text-amber-600' },
  notes: { label: 'Notes', icon: BookOpen, tile: 'bg-cyan-50 text-cyan-600' },
  lab_manual: { label: 'Lab Manuals', icon: FlaskConical, tile: 'bg-emerald-50 text-emerald-600' },
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'syllabus', label: 'Syllabus' },
  { id: 'pyq', label: 'PYQs' },
  { id: 'notes', label: 'Notes' },
  { id: 'lab_manual', label: 'Lab Manuals' },
]

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

function statusBadge(status: Material['status']) {
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
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-[108px] rounded-xl" />
        ))}
      </div>
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

export function MaterialsView() {
  const { user } = useAuth()
  const isFaculty = user?.role === 'FACULTY'

  const [materials, setMaterials] = useState<Material[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSubject, setSelectedSubject] = useState<string>(AUTO_SUBJECT)
  const [selectedClassroom, setSelectedClassroom] = useState<string>(NO_CLASSROOM)
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [search, setSearch] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [creating, setCreating] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mats, subs] = await Promise.all([
        api.get<Material[]>('/materials'),
        api.get<Subject[]>('/subjects'),
      ])
      setMaterials(mats)
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
  }, [isFaculty])

  useEffect(() => {
    load()
  }, [load])

  /* rotate the animated AI step label for every in-flight upload */
  const anyUploading = uploadQueue.some(u => u.status === 'uploading')
  useEffect(() => {
    if (!anyUploading) return
    const t = window.setInterval(() => {
      setUploadQueue(q =>
        q.map(u =>
          u.status === 'uploading' ? { ...u, stage: (u.stage + 1) % AI_STEPS.length } : u
        )
      )
    }, 4000)
    return () => window.clearInterval(t)
  }, [anyUploading])

  /* ---------- upload (drag & drop + browse) ---------- */

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

      const materialType = activeTab === 'all' ? 'NOTES' : UPLOAD_TYPE[activeTab]
      const jobs: UploadJob[] = valid.map(f => ({
        id: crypto.randomUUID(),
        name: f.name,
        status: 'uploading' as const,
        stage: 0,
      }))
      setUploadQueue(q => [...q, ...jobs])

      let ok = 0
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i]!
        const job = jobs[i]!
        try {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('material_type', materialType)
          if (selectedSubject !== AUTO_SUBJECT) fd.append('subject_id', selectedSubject)
          if (isFaculty && selectedClassroom !== NO_CLASSROOM) {
            fd.append('classroom_id', selectedClassroom)
          }
          const res = await api.upload<MaterialUploadResult>('/materials/upload', fd)
          ok++
          setUploadQueue(q => q.map(u => (u.id === job.id ? { ...u, status: 'done' } : u)))

          if (res.processingMethod === 'FALLBACK' || res.material.status === 'failed') {
            toast.warning('Saved file, but AI analysis failed — try re-uploading')
          } else if (res.created.isNewSubject) {
            toast.success(
              `✨ ${res.subject.name} ready — ${res.created.units} units · ${res.created.topics} topics · ${res.created.questions} questions generated`
            )
          } else {
            toast.success(
              `Added to ${res.subject.name} — ${res.created.questions} new questions`
            )
          }
        } catch (err) {
          setUploadQueue(q => q.map(u => (u.id === job.id ? { ...u, status: 'error' } : u)))
          toast.error(`"${file.name}" failed: ${err instanceof Error ? err.message : 'upload error'}`)
        }
      }

      if (ok > 0) {
        try {
          // subjects/materials both change when the AI pipeline runs
          const [mats, subs] = await Promise.all([
            api.get<Material[]>('/materials'),
            api.get<Subject[]>('/subjects'),
          ])
          setMaterials(mats)
          setSubjects(subs)
        } catch {
          /* keep current list on refresh failure */
        }
      }

      // fade the queue out once uploads settle
      window.setTimeout(() => {
        setUploadQueue(q => q.filter(u => !jobs.some(j => j.id === u.id)))
      }, 3500)
    },
    [selectedSubject, selectedClassroom, activeTab, isFaculty]
  )

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

  const onboarding = materials.length === 0 && subjects.length === 0

  const tabCount = (id: TabId) =>
    id === 'all' ? materials.length : materials.filter(m => m.type === id).length

  const filtered = materials
    .filter(m => activeTab === 'all' || m.type === activeTab)
    .filter(m => m.name.toLowerCase().includes(search.trim().toLowerCase()))

  if (loading) return <div className="animate-fade-in-up"><MaterialsSkeleton /></div>
  if (error) {
    return (
      <div className="animate-fade-in-up">
        <ViewHeader title="Study Materials" subtitle="Upload and manage your study files" />
        <ErrorCard message={error} onRetry={load} />
      </div>
    )
  }

  const uploading = anyUploading

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
          <div className="w-full sm:w-64">
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

          {isFaculty && (
            <div className="w-full sm:w-64">
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
          <p className="hidden text-xs text-slate-400 lg:block">
            Auto-detect lets the AI pick the subject from the file content.
          </p>
        </div>
      )}

      {/* Drag & drop upload zone — the primary interaction */}
      <div>
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload study materials"
          onClick={() => {
            if (!uploading) fileInputRef.current?.click()
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!uploading) fileInputRef.current?.click()
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
            void handleFiles(e.dataTransfer.files)
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
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            {uploading ? 'AI is analyzing your files…' : 'Upload Study Materials'}
          </h3>
          <p className="text-xs text-slate-500">
            Drag &amp; drop files or click to browse · PDF, DOC, Images · Max 10MB each
          </p>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Uploads run the full AI pipeline — expect 20–60 seconds per file.
        </p>

        {/* per-file AI pipeline progress */}
        {uploadQueue.length > 0 && (
          <div className="mt-3 space-y-2 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
            {uploadQueue.map(job => (
              <div key={job.id} className="flex items-center gap-2.5 text-sm">
                {job.status === 'uploading' && (
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
                    job.status === 'uploading' && 'text-violet-600',
                    job.status === 'done' && 'text-emerald-600',
                    job.status === 'error' && 'text-red-600'
                  )}
                >
                  {job.status === 'uploading'
                    ? AI_STEPS[job.stage]
                    : job.status === 'done'
                      ? 'Done'
                      : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs + search + grid — only meaningful once something exists */}
      {!onboarding && (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabId)}>
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 p-1 lg:w-auto">
                {TABS.map(t => (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-xs"
                  >
                    {t.label}
                    <span className="ml-1.5 rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
                      {tabCount(t.id)}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search materials…"
                className="h-9 bg-white pl-9 text-sm"
              />
            </div>
          </div>

          {/* Materials grid */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={search.trim() ? 'No materials match your search' : 'No materials found'}
              message={
                search.trim()
                  ? `Nothing matches "${search.trim()}" in this tab.`
                  : activeTab === 'all'
                    ? 'Upload your syllabus, PYQs, notes, or lab manuals to get started.'
                    : `No ${TYPE_META[activeTab as MaterialType].label} yet — drop files above and they will show up here.`
              }
            />
          ) : (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
              {filtered.map((mat, i) => {
                const meta = TYPE_META[mat.type] ?? TYPE_META.notes
                return (
                  <Card
                    key={mat.id}
                    className={cn(
                      'animate-fade-in-up shadow-xs transition-shadow hover:shadow-md',
                      STAGGER[i % STAGGER.length]
                    )}
                  >
                    <CardContent className="flex items-start gap-3.5 p-4">
                      <div
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                          meta.tile
                        )}
                      >
                        <meta.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p title={mat.name} className="truncate text-sm font-semibold text-slate-800">
                          {mat.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {mat.subject} · {mat.size}
                        </p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
                        <span className="mt-1.5 block text-[11px] text-slate-400">
                          {formatDate(mat.uploadDate)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
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
    </div>
  )
}

export default MaterialsView
