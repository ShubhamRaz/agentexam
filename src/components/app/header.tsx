'use client'

import { Menu, Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Your exam preparation overview' },
  materials: { title: 'Materials', subtitle: 'Manage your study materials' },
  syllabus: { title: 'Syllabus Analysis', subtitle: 'AI-analyzed topic importance and weightage' },
  'pyq-analysis': { title: 'PYQ Analysis', subtitle: 'Previous year question patterns and trends' },
  exam: { title: 'Theory Exam', subtitle: 'Practice with AI-generated questions' },
  practical: { title: 'Practical Exam', subtitle: 'Lab experiments and code submissions' },
  viva: { title: 'AI Viva', subtitle: 'AI-powered viva voce practice' },
  performance: { title: 'Performance', subtitle: 'Track your progress and identify weak areas' },
  readiness: { title: 'Exam Readiness', subtitle: 'How prepared are you for the exam?' },
  'study-plan': { title: 'Study Plan', subtitle: 'Your personalized AI study schedule' },
  profile: { title: 'Profile & Settings', subtitle: 'Manage your account' },
}

export function Header({ view, onMenuClick }: { view: string; onMenuClick: () => void }) {
  const meta = PAGE_META[view] || PAGE_META.dashboard

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-base font-bold text-slate-900">{meta.title}</h2>
        <p className="hidden truncate text-xs text-slate-400 sm:block">{meta.subtitle}</p>
      </div>

      <div className="hidden items-center md:flex">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search anything…"
            className="h-9 w-56 rounded-lg border-slate-200 bg-slate-50 pl-9 text-sm placeholder:text-slate-400"
            aria-label="Search"
          />
        </div>
      </div>

      <Button variant="ghost" size="icon" className="relative text-slate-500" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
      </Button>
    </header>
  )
}
