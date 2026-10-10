'use client'

/* ============================================
   AGENTEXAM — Study Materials view
   Ported from original Frontend/src/pages/Materials.jsx
   (fixes the original's broken onDrop + window.prompt subject creation)
   ============================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Upload,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type { Material, MaterialType, Subject } from '@/lib/types'
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
}

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

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

export function MaterialsView() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedSubject, setSelectedSubject] = useState('')
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
      setSelectedSubject(prev => prev || subs[0]?.id || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load materials')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* ---------- upload (drag & drop + browse) ---------- */

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList)
      if (files.length === 0) return
      if (!selectedSubject) {
        toast.warning('Select a subject first')
        return
      }

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
        status: 'uploading',
      }))
      setUploadQueue(q => [...q, ...jobs])

      let ok = 0
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i]!
        const job = jobs[i]!
        try {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('subject_id', selectedSubject)
          fd.append('material_type', materialType)
          await api.upload<Material>('/materials/upload', fd)
          ok++
          setUploadQueue(q => q.map(u => (u.id === job.id ? { ...u, status: 'done' } : u)))
        } catch (err) {
          setUploadQueue(q => q.map(u => (u.id === job.id ? { ...u, status: 'error' } : u)))
          toast.error(`"${file.name}" failed: ${err instanceof Error ? err.message : 'upload error'}`)
        }
      }

      if (ok > 0) {
        toast.success(`${ok} file${ok === 1 ? '' : 's'} uploaded`)
        try {
          const mats = await api.get<Material[]>('/materials')
          setMaterials(mats)
        } catch {
          /* keep current list on refresh failure */
        }
      }

      // fade the queue out once uploads settle
      window.setTimeout(() => {
        setUploadQueue(q => q.filter(u => !jobs.some(j => j.id === u.id)))
      }, 2500)
    },
    [selectedSubject, activeTab]
  )

  /* ---------- subject creation ---------- */

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

  const uploading = uploadQueue.some(u => u.status === 'uploading')

  return (
    <div className="animate-fade-in-up space-y-6">
      <ViewHeader
        title="Study Materials"
        subtitle="Upload syllabus, PYQs, notes & lab manuals — files land here and get analyzed"
      >
        <AIBadge label="AI Analyzed" />
      </ViewHeader>

      {/* Upload target row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-64">
          <Label htmlFor="upload-subject" className="text-xs font-medium text-slate-500">
            Target subject
          </Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger id="upload-subject" className="mt-1.5 w-full bg-white">
              <SelectValue placeholder="Choose a subject…" />
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
        <Button
          variant="outline"
          className="h-9 border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" /> Add New Subject
        </Button>
        <p className="hidden text-xs text-slate-500 lg:block">
          Select or add a subject before dropping files.
        </p>
      </div>

      {/* Drag & drop upload zone */}
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
            {uploading ? 'Uploading…' : 'Upload Study Materials'}
          </h3>
          <p className="text-xs text-slate-500">
            Drag &amp; drop files or click to browse · PDF, DOC, Images · Max 10MB each
          </p>
        </div>

        {/* per-file upload progress */}
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
                  {job.status === 'uploading' ? 'Uploading…' : job.status === 'done' ? 'Done' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs + search */}
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
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {statusBadge(mat.status)}
                      <span className="text-[11px] text-slate-400">{formatDate(mat.uploadDate)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add subject dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Subject</DialogTitle>
            <DialogDescription>
              Create a subject to organize your materials, tests and analytics.
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
