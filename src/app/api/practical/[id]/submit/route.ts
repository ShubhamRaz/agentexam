import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { evaluatePracticalSubmission } from '@/lib/ai'
import { round2 } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const test = await db.mockTest.findUnique({ where: { id } })
  if (!test || test.studentId !== user.id) {
    return Response.json({ error: 'Test not found' }, { status: 404 })
  }
  if (test.testType !== 'PRACTICAL') {
    return Response.json({ error: 'Not a practical test' }, { status: 400 })
  }
  if (test.status === 'EVALUATED') {
    return Response.json({ error: 'This practical has already been submitted' }, { status: 400 })
  }

  let body: { code?: string }
  try {
    body = (await req.json()) as { code?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const code = body.code || ''
  if (!code.trim()) {
    return Response.json({ error: 'Code submission is required' }, { status: 400 })
  }

  // experiment id is stored as the sole entry of test.questionIds
  let experimentId: string | null = null
  try {
    const ids = JSON.parse(test.questionIds) as string[]
    experimentId = ids[0] ?? null
  } catch {
    experimentId = null
  }
  if (!experimentId) {
    return Response.json({ error: 'Practical test has no experiment attached' }, { status: 400 })
  }
  const experiment = await db.experiment.findUnique({ where: { id: experimentId } })
  if (!experiment) {
    return Response.json({ error: 'Experiment not found' }, { status: 404 })
  }

  const evaluation = await evaluatePracticalSubmission(
    experiment.title,
    experiment.description,
    experiment.expectedOutput,
    code,
    experiment.marks
  )

  const score = round2(evaluation.score)
  const percentage = Math.round(evaluation.percentage)

  // mark test evaluated
  await db.mockTest.update({
    where: { id: test.id },
    data: { status: 'EVALUATED', submittedAt: new Date() },
  })

  // Note: no Answer row is created — experiment ids are not Question ids
  // (FK constraint), so the Result is written directly.
  await db.result.deleteMany({ where: { testId: test.id } })
  await db.result.create({
    data: {
      testId: test.id,
      studentId: user.id,
      totalMarks: experiment.marks,
      obtainedMarks: score,
      percentage,
      grade: percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F',
      passStatus: percentage >= 40,
      analytics: JSON.stringify({
        improvement_suggestions: evaluation.suggestions,
      }),
    },
  })

  return Response.json({
    score,
    percentage,
    feedback: evaluation.feedback,
    suggestions: evaluation.suggestions,
  })
}
