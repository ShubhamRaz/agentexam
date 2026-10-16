import { NextRequest } from 'next/server'
import { getAuthUser, unauthorized } from '@/lib/auth'
import {
  getEvaluatedTests,
  getAnswerRows,
  overallAccuracy,
  computeTopicPerformance,
  type TopicRow,
} from '@/app/api/lib/compute'
import type { ReadinessData } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const tests = await getEvaluatedTests(user.id)
  const answerRows = await getAnswerRows(user.id)
  const topicRows = computeTopicPerformance(answerRows)

  const totalTests = tests.length
  const overallScore =
    totalTests > 0
      ? Math.round(tests.reduce((sum, t) => sum + t.result.percentage, 0) / totalTests)
      : 0

  const status: ReadinessData['status'] =
    totalTests < 5
      ? 'INSUFFICIENT_DATA'
      : overallScore >= 70
        ? 'HIGH'
        : overallScore >= 40
          ? 'MODERATE'
          : 'LOW'

  const estimatedStudyHoursNeeded = Math.round((100 - overallScore) * 2.5)

  const topicsAttempted = new Set(
    answerRows.filter(r => r.topicId).map(r => r.topicId)
  ).size

  // per-subject aggregates (from tests + topic analytics)
  const testAgg = new Map<string, { subject: string; pctTotal: number; count: number }>()
  for (const t of tests) {
    const cur = testAgg.get(t.subjectId) ?? { subject: t.subject, pctTotal: 0, count: 0 }
    cur.pctTotal += t.result.percentage
    cur.count += 1
    testAgg.set(t.subjectId, cur)
  }
  const topicsBySubject = new Map<string, TopicRow[]>()
  for (const tr of topicRows) {
    const list = topicsBySubject.get(tr.subjectId) ?? []
    list.push(tr)
    topicsBySubject.set(tr.subjectId, list)
  }
  const subjectIds = new Set<string>([...testAgg.keys(), ...topicsBySubject.keys()])
  const subjectReadiness = Array.from(subjectIds).map(sid => {
    const agg = testAgg.get(sid)
    const score = agg ? Math.round(agg.pctTotal / agg.count) : 0
    const topics = topicsBySubject.get(sid) ?? []
    return {
      subject: agg?.subject ?? topics[0]?.subject ?? 'Unknown',
      score,
      status: (score >= 70 ? 'on_track' : score >= 40 ? 'needs_attention' : 'at_risk') as
        | 'on_track'
        | 'needs_attention'
        | 'at_risk',
      topicsReady: topics.filter(t => t.score >= 60).length,
      totalTopics: topics.length,
    }
  })

  const weakRows = topicRows.filter(t => t.status === 'weak').sort((a, b) => a.score - b.score)
  const riskAreas = weakRows.map(w => ({
    topic: w.topic,
    subject: w.subject,
    risk: (w.score < 35 ? 'high' : 'medium') as 'high' | 'medium',
    reason: `Low accuracy (${w.score}%) — frequently tested topic`,
  }))

  const recommendations: ReadinessData['recommendations'] = []
  for (const r of riskAreas.slice(0, 3)) {
    recommendations.push({
      action: `Revise ${r.topic} (${r.subject}) unit notes and solve 10 practice questions`,
      estimatedTime: '45m',
      priority: r.risk === 'high' ? 'high' : 'medium',
    })
  }
  const focusSubject =
    riskAreas[0]?.subject ?? subjectReadiness[0]?.subject ?? 'your weakest subject'
  recommendations.push({
    action: `Attempt a medium-difficulty mock test on ${focusSubject}`,
    estimatedTime: '60m',
    priority: 'medium',
  })
  recommendations.push({
    action: 'Take an AI viva session to strengthen oral answers',
    estimatedTime: '15m',
    priority: 'low',
  })
  if (recommendations.length < 3) {
    recommendations.push({
      action: "Review your study plan and complete today's scheduled tasks",
      estimatedTime: '45m',
      priority: 'medium',
    })
  }

  const payload: ReadinessData = {
    overallScore,
    status,
    estimatedStudyHoursNeeded,
    breakdown: {
      accuracy: overallAccuracy(answerRows),
      topicsAttempted,
    },
    subjectReadiness,
    riskAreas,
    recommendations: recommendations.slice(0, 5),
  }
  return Response.json(payload)
}
