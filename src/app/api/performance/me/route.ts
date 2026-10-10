import { NextRequest } from 'next/server'
import { getAuthUser, unauthorized } from '@/lib/auth'
import {
  getEvaluatedTests,
  getAnswerRows,
  overallAccuracy,
  computeTopicPerformance,
  round1,
  WEAK_TOPIC_RECOMMENDATION,
} from '@/app/api/lib/compute'
import type { PerformanceData } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const tests = await getEvaluatedTests(user.id)
  const answerRows = await getAnswerRows(user.id)

  const percentages = tests.map(t => t.result.percentage)
  const totalTests = tests.length
  const averageScore = totalTests > 0 ? round1(percentages.reduce((a, b) => a + b, 0) / totalTests) : 0
  const improvement =
    totalTests >= 2 ? round1(percentages[totalTests - 1] - percentages[0]) : 0
  const accuracy = overallAccuracy(answerRows)
  const studyHours = round1(totalTests * 0.75)

  const scoreTrend = tests.map(t => ({
    date: t.result.createdAt.toISOString().slice(0, 10),
    score: Math.round(t.result.percentage),
  }))
  const accuracyTrend = tests.map(t => ({
    date: t.result.createdAt.toISOString().slice(0, 10),
    accuracy: Math.round(t.result.percentage), // percentage as proxy
  }))

  // subject performance: average pct + obtained/total ratio
  const subjectMap = new Map<
    string,
    { subject: string; pctTotal: number; count: number; obtained: number; total: number }
  >()
  for (const t of tests) {
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
    accuracy:
      v.total > 0 ? round1((v.obtained / v.total) * 100) : round1(v.pctTotal / v.count),
  }))

  const topicRows = computeTopicPerformance(answerRows)
  const topicPerformance = topicRows.map(t => ({
    topic: t.topic,
    subject: t.subject,
    score: t.score,
    status: t.status,
  }))
  const weakTopics = topicRows
    .filter(t => t.status === 'weak')
    .sort((a, b) => a.score - b.score)
    .map(t => ({
      topic: t.topic,
      subject: t.subject,
      score: t.score,
      recommendation: WEAK_TOPIC_RECOMMENDATION,
    }))

  const payload: PerformanceData = {
    overall: { totalTests, averageScore, improvement, accuracy, studyHours },
    scoreTrend,
    accuracyTrend,
    subjectPerformance,
    topicPerformance,
    weakTopics,
  }
  return Response.json(payload)
}
