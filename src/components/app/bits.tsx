'use client'

/* Shared AgentExam UI building blocks — used by every view.
   Design language: violet primary, cyan accent, AI-purple accents,
   light SaaS aesthetic, rounded-xl white cards on slate-50 bg. */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getScoreColor } from '@/lib/helpers'

/* ---------- Page header inside each view ---------- */

export function ViewHeader({ title, subtitle, children }: {
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

/* ---------- Stat card ---------- */

export function StatCard({ icon: Icon, label, value, change, iconClassName, className }: {
  icon: LucideIcon
  label: string
  value: string | number
  change?: string
  iconClassName?: string
  className?: string
}) {
  return (
    <Card className={cn('animate-fade-in-up shadow-xs transition-shadow hover:shadow-md', className)}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          iconClassName || 'bg-violet-50 text-violet-600'
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {change && <p className="text-xs font-medium text-emerald-600">{change}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------- AI badge ---------- */

export function AIBadge({ label = 'AI', className }: { label?: string; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700',
      className
    )}>
      <Sparkles className="h-3 w-3" />
      {label}
    </span>
  )
}

/* ---------- AI highlighted card ---------- */

export function AICard({ title, icon: Icon, children, className }: {
  title?: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-cyan-50/40 p-5 shadow-xs',
      className
    )}>
      {title && (
        <div className="mb-3 flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-violet-600" />}
          <h3 className="text-sm font-semibold text-violet-900">{title}</h3>
          <AIBadge />
        </div>
      )}
      <div className="text-sm leading-relaxed text-slate-700">{children}</div>
    </div>
  )
}

/* ---------- Circular progress ---------- */

export function ProgressCircle({ value, size = 120, strokeWidth = 10, color, trackColor, className, children }: {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  className?: string
  children?: React.ReactNode
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const stroke = color || (clamped >= 80 ? '#10B981' : clamped >= 60 ? '#F59E0B' : clamped >= 40 ? '#F97316' : '#EF4444')

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor || '#E2E8F0'} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ?? (
          <>
            <span className={cn('text-2xl font-bold', getScoreColor(clamped))}>{Math.round(clamped)}%</span>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- Section card with header ---------- */

export function SectionCard({ title, action, children, className, contentClassName, badge }: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  badge?: React.ReactNode
}) {
  return (
    <Card className={cn('shadow-xs', className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 py-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {title}
          {badge}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className={cn('p-5', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

/* ---------- Empty / loading / error states ---------- */

export function EmptyState({ icon: Icon, title, message, action }: {
  icon: LucideIcon
  title: string
  message?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {message && <p className="mt-1 max-w-sm text-xs text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingCard({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 rounded-xl border border-slate-100 bg-white py-16', className)}>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  )
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50/60 py-12 text-center">
      <p className="text-sm font-semibold text-red-700">Something went wrong</p>
      <p className="max-w-md text-xs text-red-600">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>
      )}
    </div>
  )
}

/* ---------- Score pill ---------- */

export function ScorePill({ score, suffix = '%' }: { score: number; suffix?: string }) {
  return (
    <Badge variant="outline" className={cn(
      'font-bold tabular-nums',
      score >= 80 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
      score >= 60 ? 'border-amber-200 bg-amber-50 text-amber-700' :
      score >= 40 ? 'border-orange-200 bg-orange-50 text-orange-700' :
      'border-red-200 bg-red-50 text-red-700'
    )}>
      {Math.round(score)}{suffix}
    </Badge>
  )
}

/* ---------- Importance badge ---------- */

export function ImportanceBadge({ importance }: { importance: string }) {
  const styles: Record<string, string> = {
    high: 'border-red-200 bg-red-50 text-red-700',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }
  return (
    <Badge variant="outline" className={cn('text-[11px] capitalize', styles[importance] || styles.medium)}>
      {importance}
    </Badge>
  )
}
