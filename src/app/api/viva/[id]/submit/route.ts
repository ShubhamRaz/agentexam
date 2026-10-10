import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { generateImprovementSuggestions } from '@/lib/ai'
import { round2 } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const test = await db.mockTest.findUnique({
    where: { id },
    include: { answers: true },
  })
  if (!test || test.studentId !== user.id) {
    return Response.json({ error: 'Viva session not found' }, { status: 404 })
  }
  if (test.testType !== 'VIVA') {
    return Response.json({ error: 'Not a viva session' }, { status: 400 })
  }
  if (test.status === 'EVALUATED') {
    return Response.json({ error: 'This viva session has already been submitted' }, { status: 400 })
  }
  const subject = await db.subject.findUnique({ where: { id: test.subjectId } })
  const subjectName = subject?.name ?? 'Unknown'

  let questionIds: string[] = []
  try {
    questionIds = JSON.parse(test.questionIds) as string[]
  } catch {
    questionIds = []
  }
  const questions = await db.question.findMany({ where: { id: { in: questionIds } } })
  const byId = new Map(questions.map(q => [q.id, q]))
  const answerByQuestion = new Map(test.answers.map(a => [a.questionId, a]))

  const total = round2(questions.reduce((sum, q) => sum + q.marks, 0))
  const obtained = round2(
    questions.reduce((sum, q) => sum + (answerByQuestion.get(q.id)?.marksObtained ?? 0), 0)
  )
  const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0

  // weak questions: score below 50%
  const weakTexts: string[] = []
  for (const q of questions) {
    const ans = answerByQuestion.get(q.id)
    const ratio = q.marks > 0 ? (ans?.marksObtained ?? 0) / q.marks : 0
    if (ratio < 0.5) weakTexts.push(q.questionText)
  }

  const suggestions = await generateImprovementSuggestions(subjectName, percentage, weakTexts)

  await db.result.deleteMany({ where: { testId: test.id } })
  await db.result.create({
    data: {
      testId: test.id,
      studentId: user.id,
      totalMarks: total,
      obtainedMarks: obtained,
      percentage,
      grade:
        percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F',
      passStatus: percentage >= 40,
      analytics: JSON.stringify({ improvement_suggestions: suggestions }),
    },
  })

  await db.mockTest.update({
    where: { id: test.id },
    data: {
      status: 'EVALUATED',
      submittedAt: new Date(),
      totalMarks: total,
    },
  })

  return Response.json({
    percentage,
    obtained,
    total,
    analytics: { improvement_suggestions: suggestions },
  })
}
