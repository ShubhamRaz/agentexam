import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import type { ExamQuestion, QuestionType } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface RawOption {
  id: string
  text: string
  is_correct?: boolean
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params
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

  // start the clock only once (DRAFT → IN_PROGRESS)
  let current = test
  if (test.status === 'DRAFT') {
    const now = new Date()
    current = await db.mockTest.update({
      where: { id: test.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: now,
        expiresAt: new Date(now.getTime() + test.durationMinutes * 60 * 1000),
      },
      include: { answers: true },
    })
  } else if (test.status !== 'IN_PROGRESS') {
    return Response.json({ error: 'This test has already been submitted' }, { status: 400 })
  }

  let questionIds: string[] = []
  try {
    questionIds = JSON.parse(current.questionIds) as string[]
  } catch {
    questionIds = []
  }

  const questions = await db.question.findMany({
    where: { id: { in: questionIds } },
  })
  // preserve the stored question order
  const byId = new Map(questions.map(q => [q.id, q]))
  const ordered = questionIds.map(qid => byId.get(qid)).filter(q => !!q)

  const mapped: ExamQuestion[] = ordered.map(q => {
    let options: RawOption[] = []
    try {
      options = q.options ? (JSON.parse(q.options) as RawOption[]) : []
    } catch {
      options = []
    }
    return {
      id: q.id,
      question_type: q.questionType as QuestionType,
      question_text: q.questionText,
      marks: q.marks,
      // NEVER leak is_correct to students before submission
      options: options
        .filter(o => o && o.id)
        .map(o => ({ id: String(o.id), text: String(o.text) })),
    }
  })

  return Response.json({
    id: current.id,
    questions: mapped,
    saved_answers: current.answers.map(a => ({
      question_id: a.questionId,
      answer_text: a.answerText,
      selected_option_id: a.selectedOptionId,
    })),
  })
}
