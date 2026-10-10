import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import {
  getEvaluatedTests,
  getAnswerRows,
  computeTopicPerformance,
  getTodayTasks,
  round1,
  WEAK_TOPIC_RECOMMENDATION,
} from '@/app/api/lib/compute'
import type { DashboardData } from '@/lib/types'

export const dynamic = 'force-dynamic'

const TYPE_ICONS: Record<string, string> = {
  THEORY: '📝',
  PRACTICAL: '🔬',
  VIVA: '🎤',
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const evaluated = await getEvaluatedTests(user.id)
  const answerRows = await getAnswerRows(user.id)
  const topicRows = computeTopicPerformance(answerRows)

  // ---- student block ----
  const allTests = await db.mockTest.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  const testsCompleted = evaluated.length
  const averageScore =
    testsCompleted > 0
      ? round1(evaluated.reduce((sum, t) => sum + t.result.percentage, 0) / testsCompleted)
      : 0
  const streak = allTests.length >= 3 ? 3 : allTests.length
  const totalStudyHours = Math.round(testsCompleted * 0.75)

  // ---- readiness ----
  const readinessScore =
    testsCompleted > 0
      ? Math.round(evaluated.reduce((sum, t) => sum + t.result.percentage, 0) / testsCompleted)
      : 0

  // ---- exam countdown ----
  const examDate = user.examDate
  const daysLeft = examDate
    ? Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / (24 * 3600 * 1000)))
    : 0

  // ---- recent tests (last 5 evaluated, newest first) ----
  const recentTests = [...evaluated]
    .sort((a, b) => (b.submittedAt ?? b.createdAt).getTime() - (a.submittedAt ?? a.createdAt).getTime())
    .slice(0, 5)
    .map(t => ({
      type: t.testType.toLowerCase(),
      name: `${t.subject} Mock Test`,
      score: Math.round(t.result.percentage),
      date: (t.submittedAt ?? t.createdAt).toISOString(),
    }))

  // ---- recent activity (last 4 tests of any type) ----
  const activityTests = await db.mockTest.findMany({
    where: { studentId: user.id },
    include: { result: true },
    orderBy: { createdAt: 'desc' },
    take: 4,
  })
  const subjects = await db.subject.findMany()
  const subjectById = new Map(subjects.map(s => [s.id, s]))
  const recentActivity = activityTests.map(t => ({
    id: t.id,
    icon: TYPE_ICONS[t.testType] ?? '📝',
    title:
      t.testType === 'VIVA'
        ? `${subjectById.get(t.subjectId)?.name ?? 'Unknown'} Viva Session`
        : t.testType === 'PRACTICAL'
          ? `${subjectById.get(t.subjectId)?.name ?? 'Unknown'} Practical`
          : `${subjectById.get(t.subjectId)?.name ?? 'Unknown'} Mock Test`,
    time: (t.submittedAt ?? t.createdAt).toISOString(),
    ...(t.result ? { score: Math.round(t.result.percentage) } : {}),
  }))

  // ---- today's tasks from study plan ----
  const todayTasks = await getTodayTasks(user.id)

  // ---- weak topics (top 4, worst first) ----
  const weakTopics = topicRows
    .filter(t => t.status === 'weak')
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map(t => ({
      topic: t.topic,
      subject: t.subject,
      score: t.score,
      recommendation: WEAK_TOPIC_RECOMMENDATION,
    }))

  // ---- subject performance ----
  const subjectMap = new Map<
    string,
    { subject: string; pctTotal: number; count: number; obtained: number; total: number }
  >()
  for (const t of evaluated) {
    const cur =
      subjectMap.get(t.subjectId) ??
      { subject: t.subject, pctTotal: 0, count: 0, obtained: 0, total: 0 }
    cur.pctTotal += t.result.percentage
    cur.count += 1
    cur.obtained += t.result.obtainedMarks
    cur.total += t.result.totalMarks
    subjectMap.set(t.subjectId, cur)
  }
  const subjectPerformance = Array.from(subjectMap.values()).map(v => ({
    subject: v.subject,
    score: round1(v.pctTotal / v.count),
    tests: v.count,
    accuracy: v.total > 0 ? round1((v.obtained / v.total) * 100) : 0,
  }))

  const payload: DashboardData = {
    student: { name: user.name, streak, averageScore, testsCompleted, totalStudyHours },
    readinessScore,
    daysLeft,
    examDate: examDate ? examDate.toISOString() : null,
    recentTests,
    recentActivity,
    todayTasks,
    weakTopics,
    subjectPerformance,
  }
  return Response.json(payload)
}
