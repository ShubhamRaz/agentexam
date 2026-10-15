import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { isSubjectVisible } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  let body: { experiment_id?: string }
  try {
    body = (await req.json()) as { experiment_id?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const experimentId = body.experiment_id || ''
  if (!experimentId) {
    return Response.json({ error: 'experiment_id is required' }, { status: 400 })
  }

  const experiment = await db.experiment.findUnique({ where: { id: experimentId } })
  if (!experiment) {
    return Response.json({ error: 'Experiment not found' }, { status: 404 })
  }
  if (!(await isSubjectVisible(user.id, experiment.subjectId))) {
    return Response.json({ error: 'Subject not available' }, { status: 403 })
  }

  const now = new Date()
  const test = await db.mockTest.create({
    data: {
      studentId: user.id,
      subjectId: experiment.subjectId,
      testType: 'PRACTICAL',
      difficultyLevel: 'MEDIUM',
      totalMarks: experiment.marks,
      durationMinutes: 60,
      status: 'IN_PROGRESS',
      questionIds: JSON.stringify([experiment.id]), // convention: [experimentId]
      startedAt: now,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    },
  })

  return Response.json({ id: test.id }, { status: 201 })
}
