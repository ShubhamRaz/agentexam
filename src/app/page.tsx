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
import { FacultyDashboardView } from '@/views/faculty-dashboard'
import { ClassroomView } from '@/views/classroom'
import type { ViewId } from '@/lib/types'

type AuthView = 'login' | 'signup' | 'forgot'

function scrollToTop() {
  if (typeof document !== 'undefined') {
    document.getElementById('ae-main')?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0 })
  }
}

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
  // `view` stays null until the user navigates; the landing view is derived
  // per-role in render (no setState-in-effect). AuthGate unmounts/remounts
  // AppShell on login/logout, so the default re-derives for each session.
  const [view, setView] = useState<ViewId | null>(null)
  const [classroomId, setClassroomId] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeView: ViewId = view ?? (user?.role === 'FACULTY' ? 'faculty-dashboard' : 'dashboard')

  const navigate = useCallback((v: ViewId) => {
    setView(v)
    // scroll content to top on view change
    scrollToTop()
  }, [])

  const openClassroom = useCallback((id: string) => {
    setClassroomId(id)
    setView('classroom')
    scrollToTop()
  }, [])

  const backToFacultyDashboard = useCallback(() => {
    setView('faculty-dashboard')
    scrollToTop()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar current={activeView} onNavigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header view={activeView} onMenuClick={() => setSidebarOpen(true)} />

        <main id="ae-main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {activeView === 'faculty-dashboard' && (
            <FacultyDashboardView onNavigate={navigate} onOpenClassroom={openClassroom} />
          )}
          {activeView === 'classroom' && classroomId !== '' && (
            <ClassroomView classroomId={classroomId} onNavigate={navigate} onBack={backToFacultyDashboard} />
          )}
          {activeView === 'dashboard' && <DashboardView onNavigate={navigate} />}
          {activeView === 'materials' && <MaterialsView />}
          {activeView === 'syllabus' && <SyllabusAnalysisView />}
          {activeView === 'pyq-analysis' && <PYQAnalysisView />}
          {activeView === 'exam' && <TheoryExamView onNavigate={navigate} />}
          {activeView === 'practical' && <PracticalExamView />}
          {activeView === 'viva' && <AIVivaView />}
          {activeView === 'performance' && <PerformanceView />}
          {activeView === 'readiness' && <ReadinessView onNavigate={navigate} />}
          {activeView === 'study-plan' && <StudyPlanView />}
          {activeView === 'profile' && <ProfileView />}
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
