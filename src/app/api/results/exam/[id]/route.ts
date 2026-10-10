import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import type { ExamResult, QuestionResult } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface AnalyticsJson {
  improvement_suggestions?: string
  weak_areas?: string[]
  strong_areas?: string[]
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const test = await db.mockTest.findUnique({
    where: { id },
    include: {
      result: true,
      answers: { include: { question: true } },
    },
  })
  if (!test || test.studentId !== user.id) {
    return Response.json({ error: 'Test not found' }, { status: 404 })
  }
  if (!test.result) {
    return Response.json({ error: 'No result found for this test' }, { status: 404 })
  }
  const subject = await db.subject.findUnique({ where: { id: test.subjectId } })

  let questionIds: string[] = []
  try {
    questionIds = JSON.parse(test.questionIds) as string[]
  } catch {
    questionIds = []
  }

  const answerByQuestion = new Map(test.answers.map(a => [a.questionId, a]))
  const question_results: QuestionResult[] = questionIds
    .map(qid => answerByQuestion.get(qid))
    .filter(a => !!a)
    .map(a => ({
      question_id: a!.questionId,
      question_text: a!.question.questionText,
      question_type: a!.question.questionType as QuestionResult['question_type'],
      marks: a!.question.marks,
      student_answer: a!.answerText,
      selected_option_id: a!.selectedOptionId,
      correct_option_id: a!.question.questionType === 'MCQ' ? a!.question.correctAnswer : null,
      marks_obtained: a!.marksObtained ?? 0,
      feedback: a!.feedback,
      explanation: a!.question.explanation,
    }))

  let analytics: AnalyticsJson = {}
  try {
    analytics = JSON.parse(test.result.analytics || '{}') as AnalyticsJson
  } catch {
    analytics = {}
  }

  const payload: ExamResult = {
    test_id: test.id,
    subject: subject?.name ?? 'Unknown',
    test_type: test.testType,
    percentage: Math.round(test.result.percentage),
    obtained_marks: test.result.obtainedMarks,
    total_marks: test.result.totalMarks,
    grade: test.result.grade ?? 'F',
    analytics: {
      improvement_suggestions: analytics.improvement_suggestions ?? '',
      weak_areas: analytics.weak_areas ?? [],
      strong_areas: analytics.strong_areas ?? [],
    },
    question_results,
  }

  return Response.json(payload)
}
