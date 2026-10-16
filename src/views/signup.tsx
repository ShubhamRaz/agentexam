'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, Check, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/types'
import { AuthLayout } from './auth-layout'
import { cn } from '@/lib/utils'

const STEPS = ['Account', 'Personal', 'Academic']

const ROLE_OPTIONS: { value: UserRole; emoji: string; title: string; desc: string }[] = [
  {
    value: 'STUDENT',
    emoji: '🎓',
    title: 'Student',
    desc: 'Prepare with AI: upload materials, get plans, take tests',
  },
  {
    value: 'FACULTY',
    emoji: '👨‍🏫',
    title: 'Faculty',
    desc: 'Share materials, add students, conduct tests, track progress',
  },
]

export function SignupView({ onNavigate }: { onNavigate: (v: 'login') => void }) {
  const { login } = useAuth()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>('STUDENT')

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '', phone: '',
    university: 'Sharda University', program: 'B.Tech Computer Science & Engineering', semester: '5',
    department: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const next = () => {
    setError(null)
    if (step === 0) {
      if (!form.email.includes('@')) return setError('Enter a valid email address.')
      if (form.password.length < 6) return setError('Password must be at least 6 characters.')
      if (form.password !== form.confirm) return setError('Passwords do not match.')
    }
    if (step === 1 && !form.name.trim()) return setError('Please enter your full name.')
    setStep(s => Math.min(2, s + 1))
  }

  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      // register with the chosen role, then auto-login (auth-context's register
      // has no role parameter, so the POST is made directly here)
      await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
      })
      await login(form.email.trim(), form.password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
      setStep(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Join as a student or faculty — AgentExam adapts to your role">
      {/* Stepper */}
      <div className="mb-7">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                i < step ? 'bg-violet-600 text-white' :
                i === step ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-600' :
                'bg-slate-100 text-slate-400'
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn('hidden text-xs font-medium sm:block', i === step ? 'text-violet-700' : 'text-slate-400')}>{label}</span>
              {i < STEPS.length - 1 && <div className={cn('h-0.5 flex-1 rounded', i < step ? 'bg-violet-600' : 'bg-slate-100')} />}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-5 animate-fade-in-up">
          <div className="space-y-2">
            <Label>I am a…</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ROLE_OPTIONS.map(opt => {
                const selected = role === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setRole(opt.value)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border p-3.5 text-left transition-colors',
                      selected
                        ? 'border-violet-600 bg-violet-50/60 ring-2 ring-violet-600/20'
                        : 'border-slate-200 bg-white hover:border-violet-300'
                    )}
                  >
                    <span className="text-2xl leading-none" role="img" aria-hidden>
                      {opt.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{opt.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                        {opt.desc}
                      </span>
                    </span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-violet-600" />}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-email">Email address</Label>
            <Input id="su-email" type="email" placeholder="you@university.edu" value={form.email} onChange={e => set('email', e.target.value)} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-password">Password</Label>
            <div className="relative">
              <Input id="su-password" type={showPassword ? 'text' : 'password'} placeholder="Minimum 6 characters" value={form.password} onChange={e => set('password', e.target.value)} className="h-10 pr-10" />
              <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Toggle password visibility">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-confirm">Confirm password</Label>
            <Input id="su-confirm" type="password" placeholder="Re-enter your password" value={form.confirm} onChange={e => set('confirm', e.target.value)} className="h-10" />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5 animate-fade-in-up">
          <div className="space-y-2">
            <Label htmlFor="su-name">Full name</Label>
            <Input id="su-name" placeholder="e.g. Arjun Sharma" value={form.name} onChange={e => set('name', e.target.value)} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-phone">Phone number <span className="font-normal text-slate-400">(optional)</span></Label>
            <Input id="su-phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} className="h-10" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5 animate-fade-in-up">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Set up your academic profile
          </p>
          <div className="space-y-2">
            <Label>University</Label>
            <Input value={form.university} onChange={e => set('university', e.target.value)} className="h-10" />
          </div>
          {role === 'STUDENT' ? (
            <>
              <div className="space-y-2">
                <Label>Program</Label>
                <Select value={form.program} onValueChange={v => set('program', v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B.Tech Computer Science & Engineering">B.Tech Computer Science & Engineering</SelectItem>
                    <SelectItem value="B.Tech Information Technology">B.Tech Information Technology</SelectItem>
                    <SelectItem value="B.Tech Electronics & Communication">B.Tech Electronics & Communication</SelectItem>
                    <SelectItem value="BCA">BCA</SelectItem>
                    <SelectItem value="M.Tech CSE">M.Tech CSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={form.semester} onValueChange={v => set('semester', v)}>
                  <SelectTrigger className="h-10 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => (
                      <SelectItem key={s} value={s}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Department you teach</Label>
              <Input
                value={form.department}
                onChange={e => set('department', e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                className="h-10"
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-7 flex gap-3">
        {step > 0 && (
          <Button variant="outline" className="h-10 px-5" onClick={() => { setError(null); setStep(s => s - 1) }}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        )}
        {step < 2 ? (
          <Button className="h-10 flex-1 bg-violet-600 font-semibold hover:bg-violet-700" onClick={next}>
            Continue
          </Button>
        ) : (
          <Button className="h-10 flex-1 bg-violet-600 font-semibold hover:bg-violet-700" disabled={loading} onClick={submit}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>
        )}
      </div>

      <div className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <button onClick={() => onNavigate('login')} className="font-semibold text-violet-600 hover:underline">
          Sign in
        </button>
      </div>
    </AuthLayout>
  )
}
