'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, clearToken, getToken, setToken } from '@/lib/api-client'
import type { AuthUser } from '@/lib/types'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      return
    }
    try {
      const me = await api.get<AuthUser>('/auth/me')
      setUser(me)
    } catch {
      clearToken()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const boot = async () => {
      if (!getToken()) {
        try { if (!cancelled) setUser(null) } finally { if (!cancelled) setLoading(false) }
        return
      }
      try {
        const me = await api.get<AuthUser>('/auth/me')
        if (!cancelled) setUser(me)
      } catch {
        clearToken()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void boot()
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: AuthUser }>('/auth/login', { email, password })
    setToken(res.access_token)
    setUser(res.user)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    await api.post<{ access_token: string; user: AuthUser }>('/auth/register', { name, email, password })
    // auto-login after register
    const res = await api.post<{ access_token: string; user: AuthUser }>('/auth/login', { email, password })
    setToken(res.access_token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
