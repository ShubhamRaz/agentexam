import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

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
    return Response.json({ error: 'Test not found' }, { status: 404 })
  }
  if (test.testType !== 'THEORY') {
    return Response.json({ error: 'Not a theory exam' }, { status: 400 })
  }
  if (test.status === 'SUBMITTED' || test.status === 'EVALUATED') {
    return Response.json({ error: 'This test has already been submitted' }, { status: 400 })
  }

  let questionIds: string[] = []
  try {
    questionIds = JSON.parse(test.questionIds) as string[]
  } catch {
    questionIds = []
  }
  if (!questionIds.includes(qid)) {
    return Response.json({ error: 'Question is not part of this test' }, { status: 400 })
  }

  let body: { answer_text?: string | null; selected_option_id?: string | null }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const existing = test.answers.find(a => a.questionId === qid)
  if (existing) {
    const data: {
      answerText?: string | null
      selectedOptionId?: string | null
      answeredAt: Date
    } = { answeredAt: new Date() }
    if ('answer_text' in body) data.answerText = body.answer_text ?? null
    if ('selected_option_id' in body) data.selectedOptionId = body.selected_option_id ?? null
    await db.answer.update({ where: { id: existing.id }, data })
  } else {
    await db.answer.create({
      data: {
        questionId: qid,
        studentId: user.id,
        testId: test.id,
        answerText: body.answer_text ?? null,
        selectedOptionId: body.selected_option_id ?? null,
      },
    })
  }

  return Response.json({ ok: true })
}
