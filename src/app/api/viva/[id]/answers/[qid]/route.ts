import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { evaluateVivaAnswer } from '@/lib/ai'
import { round2 } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; qid: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id, qid } = await ctx.params
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
  if (test.status === 'SUBMITTED' || test.status === 'EVALUATED') {
    return Response.json({ error: 'This viva session has already been submitted' }, { status: 400 })
  }

  let questionIds: string[] = []
  try {
    questionIds = JSON.parse(test.questionIds) as string[]
  } catch {
    questionIds = []
  }
  if (!questionIds.includes(qid)) {
    return Response.json({ error: 'Question is not part of this viva session' }, { status: 400 })
  }

  const question = await db.question.findUnique({
    where: { id: qid },
    include: { subject: true },
  })
  if (!question) {
    return Response.json({ error: 'Question not found' }, { status: 404 })
  }

  let body: { answer_text?: string }
  try {
    body = (await req.json()) as { answer_text?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const answerText = body.answer_text || ''

  const evaluation = await evaluateVivaAnswer(
    question.questionText,
    answerText,
    question.marks,
    question.subject.name
  )
  const marksObtained = round2(evaluation.marks_obtained)

  const existing = test.answers.find(a => a.questionId === qid)
  if (existing) {
    await db.answer.update({
      where: { id: existing.id },
      data: {
        answerText,
        marksObtained,
        feedback: evaluation.feedback,
        answeredAt: new Date(),
      },
    })
  } else {
    await db.answer.create({
      data: {
        questionId: qid,
        studentId: user.id,
        testId: test.id,
        answerText,
        marksObtained,
        feedback: evaluation.feedback,
      },
    })
  }

  return Response.json({
    marks_obtained: marksObtained,
    max_marks: question.marks,
    feedback: evaluation.feedback,
  })
}
