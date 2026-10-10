'use client'

/* Shared split-screen layout for auth views (login/signup/forgot) */

export function AuthLayout({ children, title, subtitle }: {
  children: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Form side */}
      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-[46%] xl:px-20">
        <div className="mx-auto w-full max-w-md animate-fade-in-up">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg shadow-violet-200">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 7l10-4 10 4-10 4L2 7z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 10v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">AgentExam</p>
              <p className="text-xs font-medium text-slate-400">AI-Powered Exam Preparation</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </div>

      {/* Promo side */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-1 lg:items-center lg:justify-center bg-gradient-to-br from-violet-950 via-violet-700 to-cyan-600">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute right-16 top-24 h-24 w-24 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute bottom-32 left-24 h-14 w-14 rounded-full border border-white/10" />

        <div className="relative z-10 max-w-md px-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">Your virtual examiner</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight">
            Prepare for theory <span className="text-cyan-300">&</span> practical exams with an AI mentor
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-violet-100">
            {[
              'AI-analyzed syllabus weightage and PYQ trends',
              'Adaptive mock tests with instant evaluation',
              'Simulated practicals and viva voce practice',
              'Personalized study plans targeting weak areas',
            ].map(f => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor"><path d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" /></svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex items-center gap-6 text-xs text-violet-200/80">
            <div><p className="text-2xl font-bold text-white">135+</p><p>bank questions</p></div>
            <div className="h-8 w-px bg-white/15" />
            <div><p className="text-2xl font-bold text-white">5</p><p>CSE subjects</p></div>
            <div className="h-8 w-px bg-white/15" />
            <div><p className="text-2xl font-bold text-white">AI</p><p>viva examiner</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}
