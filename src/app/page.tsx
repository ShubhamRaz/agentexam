'use client'

import { useCallback, useState } from 'react'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { Sidebar } from '@/components/app/sidebar'
import { Header } from '@/components/app/header'
import { LoginView } from '@/views/login'
import { SignupView } from '@/views/signup'
import { ForgotPasswordView } from '@/views/forgot-password'
import { DashboardView } from '@/views/dashboard'
import { MaterialsView } from '@/views/materials'
import { SyllabusAnalysisView } from '@/views/syllabus-analysis'
import { PYQAnalysisView } from '@/views/pyq-analysis'
import { TheoryExamView } from '@/views/theory-exam'
import { PracticalExamView } from '@/views/practical-exam'
import { AIVivaView } from '@/views/ai-viva'
import { PerformanceView } from '@/views/performance'
import { ReadinessView } from '@/views/readiness'
import { StudyPlanView } from '@/views/study-plan'
import { ProfileView } from '@/views/profile'
import type { ViewId } from '@/lib/types'

type AuthView = 'login' | 'signup' | 'forgot'

function BootSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg shadow-violet-200">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 7l10-4 10 4-10 4L2 7z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 10v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-[ae-fade-in-up_1s_ease-in-out_infinite] rounded-full bg-violet-500" />
        </div>
      </div>
    </div>
  )
}

function AppShell() {
  const { user } = useAuth()
  const [view, setView] = useState<ViewId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigate = useCallback((v: ViewId) => {
    setView(v)
    // scroll content to top on view change
    if (typeof document !== 'undefined') {
      document.getElementById('ae-main')?.scrollTo({ top: 0 })
      window.scrollTo({ top: 0 })
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar current={view} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header view={view} onMenuClick={() => setSidebarOpen(true)} />

        <main id="ae-main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {view === 'dashboard' && <DashboardView onNavigate={navigate} />}
          {view === 'materials' && <MaterialsView />}
          {view === 'syllabus' && <SyllabusAnalysisView />}
          {view === 'pyq-analysis' && <PYQAnalysisView />}
          {view === 'exam' && <TheoryExamView onNavigate={navigate} />}
          {view === 'practical' && <PracticalExamView />}
          {view === 'viva' && <AIVivaView />}
          {view === 'performance' && <PerformanceView />}
          {view === 'readiness' && <ReadinessView onNavigate={navigate} />}
          {view === 'study-plan' && <StudyPlanView />}
          {view === 'profile' && <ProfileView />}
        </main>

        <footer className="mt-auto border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:px-6 lg:px-8">
            <p>© 2025 AgentExam — AI-Powered Exam Preparation</p>
            <p className="text-center sm:text-right">
              AI evaluations are a preparation aid, not a substitute for official grading.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()
  const [authView, setAuthView] = useState<AuthView>('login')

  if (loading) return <BootSplash />
  if (user) return <AppShell />

  if (authView === 'signup') {
    return <SignupView onNavigate={setAuthView} />
  }
  if (authView === 'forgot') {
    return <ForgotPasswordView onNavigate={setAuthView} />
  }
  return <LoginView onNavigate={setAuthView} />
}

export default function Home() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
