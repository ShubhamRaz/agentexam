import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { getVisibleSubjectIds } from '@/app/api/lib/compute'
import type { PracticalExperiment } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Convention: a PRACTICAL MockTest stores the experiment id inside
 * test.questionIds as [experimentId] (even though it is not a Question id).
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  // experiments of subjects the user can actually see
  const visibleIds = await getVisibleSubjectIds(user.id)
  const experiments = visibleIds.length
    ? await db.experiment.findMany({
        where: { subjectId: { in: visibleIds } },
        include: { subject: true },
        orderBy: { title: 'asc' },
      })
    : []

  const tests = await db.mockTest.findMany({
    where: { studentId: user.id, testType: 'PRACTICAL' },
    include: { result: true },
    orderBy: { createdAt: 'desc' },
  })

  // experimentId → tests (newest first)
  const testsByExperiment = new Map<string, typeof tests>()
  for (const t of tests) {
    let ids: string[] = []
    try {
      ids = JSON.parse(t.questionIds) as string[]
    } catch {
      ids = []
    }
    for (const eid of ids) {
      const list = testsByExperiment.get(eid) ?? []
      list.push(t)
      testsByExperiment.set(eid, list)
    }
  }

  const payload: PracticalExperiment[] = experiments.map(e => {
    const list = testsByExperiment.get(e.id) ?? []
    const evaluated = list.find(t => t.status === 'EVALUATED' && t.result)
    const inProgress = list.find(t => t.status === 'IN_PROGRESS' || t.status === 'SUBMITTED')
    if (evaluated && evaluated.result) {
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        objective: e.objective,
        instructions: e.instructions,
        expectedOutput: e.expectedOutput,
        marks: e.marks,
        subject: e.subject.name,
        subjectId: e.subjectId,
        status: 'completed',
        score: Math.round(evaluated.result.percentage),
      }
    }
    if (inProgress) {
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        objective: e.objective,
        instructions: e.instructions,
        expectedOutput: e.expectedOutput,
        marks: e.marks,
        subject: e.subject.name,
        subjectId: e.subjectId,
        status: 'in_progress',
        score: null,
      }
    }
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      objective: e.objective,
      instructions: e.instructions,
      expectedOutput: e.expectedOutput,
      marks: e.marks,
      subject: e.subject.name,
      subjectId: e.subjectId,
      status: 'not_started',
      score: null,
    }
  })

  return Response.json(payload)
}
