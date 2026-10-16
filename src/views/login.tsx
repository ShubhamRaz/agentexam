'use client'

import { useState } from 'react'
import { Eye, EyeOff, GraduationCap, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/lib/auth-context'
import { AuthLayout } from './auth-layout'

export function LoginView({ onNavigate }: { onNavigate: (v: 'signup' | 'forgot') => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail('demo@agentexam.ai')
    setPassword('demo123')
    setError(null)
  }

  const fillFacultyDemo = () => {
    setEmail('faculty@agentexam.ai')
    setPassword('faculty123')
    setError(null)
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue your exam preparation">
      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={fillDemo}
          className="flex w-full items-center gap-2.5 rounded-lg border border-violet-200 bg-violet-50/70 px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-violet-50"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-violet-600" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-violet-800">Try the demo account</span>
            <span className="mt-0.5 block truncate font-mono text-[11px] text-violet-700">
              demo@agentexam.ai / demo123
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={fillFacultyDemo}
          className="flex w-full items-center gap-2.5 rounded-lg border border-violet-200 bg-violet-50/70 px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-violet-50"
        >
          <GraduationCap className="h-4 w-4 shrink-0 text-violet-600" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-violet-800">Faculty demo</span>
            <span className="mt-0.5 block truncate font-mono text-[11px] text-violet-700">
              faculty@agentexam.ai / faculty123
            </span>
          </span>
        </button>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => onNavigate('forgot')}
              className="text-xs font-medium text-violet-600 hover:text-violet-700 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <Checkbox checked={remember} onCheckedChange={v => setRemember(v === true)} />
          Remember me for 7 days
        </label>

        <Button
          type="submit"
          disabled={loading}
          className="h-10 w-full bg-violet-600 text-sm font-semibold hover:bg-violet-700"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <button onClick={() => onNavigate('signup')} className="font-semibold text-violet-600 hover:underline">
          Create one free
        </button>
      </div>
    </AuthLayout>
  )
}
