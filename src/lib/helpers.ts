'use client'
/* Shared presentation helpers used across AgentExam views */

export function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Burning the midnight oil'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good night'
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Exam Ready'
  if (score >= 70) return 'Well Prepared'
  if (score >= 55) return 'Getting There'
  if (score >= 40) return 'Needs Work'
  return 'At Risk'
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

export function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]!.toUpperCase())
    .join('')
}

export function truncate(text: string, n: number): string {
  return text.length > n ? text.slice(0, n) + '…' : text
}

export const IMPORTANCE_STYLES: Record<string, { badge: string; dot: string }> = {
  high: { badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  medium: { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  low: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
}

export function questionTypeLabel(t: string): string {
  switch (t) {
    case 'MCQ': return 'Objective'
    case 'SHORT_ANSWER': return 'Short Answer'
    case 'LONG_ANSWER': return 'Long Answer'
    case 'VIVA': return 'Viva'
    default: return t
  }
}

export const CHART_COLORS = ['#7C3AED', '#06B6D4', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#EC4899']
