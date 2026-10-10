'use client'

import { useState } from 'react'
import { Loader2, MailCheck, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthLayout } from './auth-layout'

export function ForgotPasswordView({ onNavigate }: { onNavigate: (v: 'login') => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setLoading(false)
    setSent(true)
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a secure reset link">
      {sent ? (
        <div className="animate-fade-in-up rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <MailCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-emerald-800">Reset link sent</p>
          <p className="mt-1 text-xs text-emerald-700">
            If an account exists for <span className="font-medium">{email}</span>, you will receive password reset instructions shortly.
          </p>
          <button onClick={() => setSent(false)} className="mt-4 text-xs font-semibold text-emerald-700 hover:underline">
            Try another email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fp-email">Email address</Label>
            <Input
              id="fp-email"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-10"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-10 w-full bg-violet-600 font-semibold hover:bg-violet-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </form>
      )}

      <button
        onClick={() => onNavigate('login')}
        className="mt-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-violet-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </button>
    </AuthLayout>
  )
}
