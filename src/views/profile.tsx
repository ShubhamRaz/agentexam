'use client'

/* AgentExam — Profile & Settings view (ported from original Profile.jsx) */

import { useCallback, useEffect, useState } from 'react'
import {
  Bell, GraduationCap, KeyRound, Loader2, Palette, Shield, Trash2, User,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorCard, ViewHeader } from '@/components/app/bits'
import { api } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { initials } from '@/lib/helpers'
import { cn } from '@/lib/utils'

interface StudentProfile {
  id: string
  name: string
  email: string
  enrollmentNo: string | null
  semester: string | null
  department: string | null
}

const NOTIFICATION_ITEMS = [
  { key: 'studyReminders', title: 'Study Reminders', desc: 'Daily study plan reminders' },
  { key: 'testResults', title: 'Test Results', desc: 'Notifications when results are ready' },
  { key: 'weakTopicAlerts', title: 'Weak Topic Alerts', desc: 'Alerts when new weak topics are identified' },
  { key: 'performanceUpdates', title: 'Performance Updates', desc: 'Weekly performance summary' },
] as const

type NotificationKey = (typeof NOTIFICATION_ITEMS)[number]['key']

export function ProfileView() {
  const { refreshUser } = useAuth()
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  // Profile form
  const [name, setName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Academic form
  const [department, setDepartment] = useState('')
  const [semester, setSemester] = useState('')
  const [savingAcademic, setSavingAcademic] = useState(false)

  // Preferences
  const [prefs, setPrefs] = useState({ examReminders: true, autoSubmit: true, soundEffects: false })

  // Notifications
  const [notifs, setNotifs] = useState<Record<NotificationKey, boolean>>({
    studyReminders: true,
    testResults: true,
    weakTopicAlerts: true,
    performanceUpdates: true,
  })

  // Change password dialog
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadTick(t => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    api.get<StudentProfile>('/students/me')
      .then(d => {
        if (cancelled) return
        setStudent(d)
        setName(d.name)
        setDepartment(d.department ?? '')
        setSemester(d.semester ?? '')
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load profile') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadTick])

  const saveProfile = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    setSavingProfile(true)
    try {
      const d = await api.put<StudentProfile>('/students/me', { name: name.trim() })
      setStudent(d)
      await refreshUser()
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }, [name, refreshUser])

  const saveAcademic = useCallback(async () => {
    if (!department.trim()) {
      toast.error('Department cannot be empty')
      return
    }
    setSavingAcademic(true)
    try {
      const d = await api.put<StudentProfile>('/students/me', { department: department.trim(), semester })
      setStudent(d)
      await refreshUser()
      toast.success('Academic information updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update academic information')
    } finally {
      setSavingAcademic(false)
    }
  }, [department, semester, refreshUser])

  const changePassword = useCallback(() => {
    if (!pw.current || !pw.next || !pw.confirm) {
      toast.error('Please fill in all password fields')
      return
    }
    if (pw.next !== pw.confirm) {
      toast.error('New passwords do not match')
      return
    }
    toast.success('Password updated (demo)')
    setPw({ current: '', next: '', confirm: '' })
    setPwOpen(false)
  }, [pw])

  const toggleNotification = useCallback((key: NotificationKey, value: boolean) => {
    setNotifs(prev => ({ ...prev, [key]: value }))
    toast('Notification preferences saved')
  }, [])

  if (loading) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Profile & Settings" subtitle="Manage your account, preferences and notifications" />
        <Card className="shadow-xs">
          <CardContent className="flex flex-col items-center gap-5 p-6 sm:flex-row">
            <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
            <div className="w-full max-w-sm space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-10 w-full max-w-xl" />
        <Card className="shadow-xs">
          <CardContent className="space-y-5 p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-9 w-32" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <ViewHeader title="Profile & Settings" subtitle="Manage your account, preferences and notifications" />
        <ErrorCard message={error || 'Profile unavailable'} onRetry={retry} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <ViewHeader title="Profile & Settings" subtitle="Manage your account, preferences and notifications" />

      {/* Profile header */}
      <Card className="shadow-xs">
        <CardContent className="flex flex-col items-center gap-5 p-6 sm:flex-row">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-2xl font-bold text-white shadow-md">
            {initials(student.name)}
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-900">{student.name}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{student.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                {student.department || 'No department set'}
              </Badge>
              <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
                Semester {student.semester || '—'}
              </Badge>
              {student.enrollmentNo && (
                <Badge variant="outline" className="border-slate-200 bg-slate-100 font-mono text-slate-600">
                  ID: {student.enrollmentNo}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0">
          <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-700 data-[state=active]:shadow-none">
            Profile
          </TabsTrigger>
          <TabsTrigger value="academic" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-700 data-[state=active]:shadow-none">
            Academic
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-700 data-[state=active]:shadow-none">
            Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-700 data-[state=active]:shadow-none">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:text-violet-700 data-[state=active]:shadow-none">
            Account
          </TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b border-slate-100 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <User className="h-4 w-4 text-violet-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <div className="grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={student.email}
                    disabled
                    className="h-10 bg-slate-50 text-slate-500"
                  />
                  <p className="text-xs text-slate-400">Email cannot be changed</p>
                </div>
              </div>
              <Button
                className="mt-6 bg-violet-600 font-semibold hover:bg-violet-700"
                onClick={saveProfile}
                disabled={savingProfile || name.trim() === student.name}
              >
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic */}
        <TabsContent value="academic" className="mt-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b border-slate-100 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <GraduationCap className="h-4 w-4 text-violet-600" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <div className="grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="academic-department">Department</Label>
                  <Input
                    id="academic-department"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academic-university">University</Label>
                  <Input id="academic-university" disabled placeholder="Not configured" className="h-10 bg-slate-50" />
                </div>
              </div>
              <Button
                className="mt-6 bg-violet-600 font-semibold hover:bg-violet-700"
                onClick={saveAcademic}
                disabled={savingAcademic || (department.trim() === (student.department ?? '') && semester === (student.semester ?? ''))}
              >
                {savingAcademic && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingAcademic ? 'Saving…' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="mt-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b border-slate-100 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Palette className="h-4 w-4 text-violet-600" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex max-w-2xl items-center justify-between gap-4 rounded-lg bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">Dark Mode</p>
                  <p className="text-xs text-slate-500">Switch between light and dark theme</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-slate-200 bg-slate-100 text-slate-500">Coming Soon</Badge>
                  <Switch disabled />
                </div>
              </div>
              <div className="flex max-w-2xl items-center justify-between gap-4 rounded-lg bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">Exam Reminders</p>
                  <p className="text-xs text-slate-500">Get reminded about upcoming tests and deadlines</p>
                </div>
                <Switch
                  checked={prefs.examReminders}
                  onCheckedChange={v => setPrefs(p => ({ ...p, examReminders: v }))}
                />
              </div>
              <div className="flex max-w-2xl items-center justify-between gap-4 rounded-lg bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">Auto-submit on Timer</p>
                  <p className="text-xs text-slate-500">Automatically submit tests when the timer runs out</p>
                </div>
                <Switch
                  checked={prefs.autoSubmit}
                  onCheckedChange={v => setPrefs(p => ({ ...p, autoSubmit: v }))}
                />
              </div>
              <div className="flex max-w-2xl items-center justify-between gap-4 rounded-lg bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">Sound Effects</p>
                  <p className="text-xs text-slate-500">Play sounds for timers and result notifications</p>
                </div>
                <Switch
                  checked={prefs.soundEffects}
                  onCheckedChange={v => setPrefs(p => ({ ...p, soundEffects: v }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b border-slate-100 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Bell className="h-4 w-4 text-violet-600" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5 sm:p-6">
              {NOTIFICATION_ITEMS.map(item => (
                <label
                  key={item.key}
                  className="flex max-w-2xl cursor-pointer items-center justify-between gap-4 rounded-lg bg-slate-50 p-4 transition-colors hover:bg-slate-100/70"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <Checkbox
                    checked={notifs[item.key]}
                    onCheckedChange={v => toggleNotification(item.key, v === true)}
                    className="border-slate-300 data-[state=checked]:border-violet-600"
                  />
                </label>
              ))}
              <p className="pt-1 text-xs text-slate-400">Preferences are saved locally in this demo.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account */}
        <TabsContent value="account" className="mt-6">
          <Card className="shadow-xs">
            <CardHeader className="border-b border-slate-100 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Shield className="h-4 w-4 text-violet-600" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-6">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Password</p>
                    <p className="text-xs text-slate-500">Update your account password</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
                    <KeyRound className="h-4 w-4" />
                    Change Password
                  </Button>
                </div>
              </div>

              {/* Danger zone */}
              <div className="max-w-2xl rounded-xl border border-red-200 bg-red-50 p-5">
                <h4 className="text-sm font-semibold text-red-700">Danger Zone</h4>
                <p className="mt-1 text-sm text-slate-600">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-4 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your account, results and study plans. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className={cn('bg-red-600 text-white hover:bg-red-700')}
                        onClick={() => toast.error('Account deletion is disabled in the demo')}
                      >
                        Yes, delete account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change password dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Update your account password. Demo only — nothing is sent to the server.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw-current">Current Password</Label>
              <Input
                id="pw-current"
                type="password"
                value={pw.current}
                onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-new">New Password</Label>
              <Input
                id="pw-new"
                type="password"
                value={pw.next}
                onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-confirm">Confirm New Password</Label>
              <Input
                id="pw-confirm"
                type="password"
                value={pw.confirm}
                onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
            <Button className="bg-violet-600 font-semibold hover:bg-violet-700" onClick={changePassword}>
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
