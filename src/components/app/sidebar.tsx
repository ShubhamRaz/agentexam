'use client'

import { Settings, LayoutDashboard, BookOpen, FileText, ClipboardList, PenTool, FlaskConical, Mic, BarChart3, Target, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/helpers'
import { useAuth } from '@/lib/auth-context'
import type { ViewId } from '@/lib/types'
import { AIBadge } from './bits'

interface NavItem {
  id: ViewId
  label: string
  icon: typeof LayoutDashboard
}

const TOP_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'materials', label: 'Materials', icon: BookOpen },
  { id: 'syllabus', label: 'Syllabus', icon: FileText },
  { id: 'pyq-analysis', label: 'PYQ Analysis', icon: ClipboardList },
]

const FACULTY_NAV: NavItem[] = [
  { id: 'faculty-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'materials', label: 'Materials', icon: BookOpen },
  { id: 'pyq-analysis', label: 'PYQ Analysis', icon: ClipboardList },
]

const PRACTICE_NAV: NavItem[] = [
  { id: 'exam', label: 'Theory Exam', icon: PenTool },
  { id: 'practical', label: 'Practical', icon: FlaskConical },
  { id: 'viva', label: 'AI Viva', icon: Mic },
]

const ANALYTICS_NAV: NavItem[] = [
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'readiness', label: 'Readiness', icon: Target },
  { id: 'study-plan', label: 'Study Plan', icon: CalendarCheck },
]

const FACULTY_ANALYTICS_NAV: NavItem[] = [
  { id: 'performance', label: 'Performance', icon: BarChart3 },
]

function NavSection({ label, items, current, onNavigate }: {
  label?: string
  items: NavItem[]
  current: ViewId
  onNavigate: (v: ViewId) => void
}) {
  return (
    <div className="mt-5">
      {label && (
        <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      )}
      <nav className="space-y-0.5">
        {items.map(item => {
          const active = current === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-violet-50 font-semibold text-violet-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <item.icon className={cn('h-4.5 w-4.5 shrink-0', active ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600')} />
              <span className="flex-1 truncate text-left">{item.label}</span>
              {item.id === 'viva' && <AIBadge label="AI" />}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function Sidebar({ current, onNavigate, open, onClose }: {
  current: ViewId
  onNavigate: (v: ViewId) => void
  open: boolean
  onClose: () => void
}) {
  const { user, logout } = useAuth()
  const isFaculty = user?.role === 'FACULTY'

  const navigate = (v: ViewId) => {
    onNavigate(v)
    onClose()
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-md shadow-violet-200">
            <PenTool className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-bold tracking-tight text-slate-900">AgentExam</p>
            <p className="text-[10.5px] font-medium text-slate-400">AI Exam Preparation</p>
          </div>
        </div>

        {/* Nav */}
        <div className="ae-scroll flex-1 overflow-y-auto px-3 pb-4">
          {isFaculty ? (
            <>
              <NavSection items={FACULTY_NAV} current={current} onNavigate={navigate} />
              <NavSection label="Analytics" items={FACULTY_ANALYTICS_NAV} current={current} onNavigate={navigate} />
            </>
          ) : (
            <>
              <NavSection items={TOP_NAV} current={current} onNavigate={navigate} />
              <NavSection label="Practice" items={PRACTICE_NAV} current={current} onNavigate={navigate} />
              <NavSection label="Analytics" items={ANALYTICS_NAV} current={current} onNavigate={navigate} />
            </>
          )}
        </div>

        {/* User footer */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-bold text-white">
              {initials(user?.name || 'Student')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-800">
                <span className="truncate">{user?.name}</span>
                {isFaculty && (
                  <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                    Faculty
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={() => navigate('profile')}
              title="Settings"
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={logout}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
