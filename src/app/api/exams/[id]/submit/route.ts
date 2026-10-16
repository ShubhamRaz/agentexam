import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { evaluateSubjectiveAnswer, generateImprovementSuggestions } from '@/lib/ai'
import type { ExamResult, QuestionResult } from '@/lib/types'
import { round2 } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

interface Q {
  id: string
  questionType: string
  questionText: string
  marks: number
  correctAnswer: string | null
  explanation: string | null
  topicName: string | null
}

interface Evaluation {
  q: Q
  answerText: string | null
  selectedOptionId: string | null
  marksObtained: number
  feedback: string
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
  if (test.status === 'SUBMITTED' || test.status === 'EVALUATED') {
    return Response.json({ error: 'This test has already been submitted' }, { status: 400 })
  }

  const subject = await db.subject.findUnique({ where: { id: test.subjectId } })
  const subjectName = subject?.name ?? 'Unknown'
  const difficulty = test.difficultyLevel

  // 1) mark submitted
  await db.mockTest.update({
    where: { id: test.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  })

  // 2) fetch questions in stored order (topic is a plain FK — join manually)
  let questionIds: string[] = []
  try {
    questionIds = JSON.parse(test.questionIds) as string[]
  } catch {
    questionIds = []
  }
  const found = await db.question.findMany({
    where: { id: { in: questionIds } },
  })
  const topicIds = Array.from(
    new Set(found.map(q => q.topicId).filter(tid => !!tid))
  ) as string[]
  const topics = topicIds.length
    ? await db.topic.findMany({ where: { id: { in: topicIds } } })
    : []
  const topicById = new Map(topics.map(t => [t.id, t]))
  const byId = new Map(found.map(q => [q.id, q]))
  const questions: Q[] = questionIds
    .map(qid => byId.get(qid))
    .filter(q => !!q)
    .map(q => ({
      id: q!.id,
      questionType: q!.questionType,
      questionText: q!.questionText,
      marks: q!.marks,
      correctAnswer: q!.correctAnswer,
      explanation: q!.explanation,
      topicName: topicById.get(q!.topicId ?? '')?.name ?? null,
    }))

  const answerByQuestion = new Map(test.answers.map(a => [a.questionId, a]))

  // 3) evaluate every question (subjective answers in parallel)
  const evaluations: Evaluation[] = await Promise.all(
    questions.map(async q => {
      const existing = answerByQuestion.get(q.id)
      const answerText = existing?.answerText ?? null
      const selectedOptionId = existing?.selectedOptionId ?? null

      if (q.questionType === 'MCQ') {
        const isCorrect = !!selectedOptionId && selectedOptionId === q.correctAnswer
        return {
          q,
          answerText,
          selectedOptionId,
          marksObtained: isCorrect ? q.marks : 0,
          feedback: isCorrect
            ? 'Correct answer.'
            : `Incorrect — the correct option is (${q.correctAnswer ?? '?'}). ${q.explanation ?? ''}`.trim(),
        }
      }

      if (answerText && answerText.trim()) {
        const ev = await evaluateSubjectiveAnswer(q.questionText, answerText, q.marks, {
          subject: subjectName,
          difficulty,
        })
        return {
          q,
          answerText,
          selectedOptionId,
          marksObtained: round2(ev.score),
          feedback: ev.feedback,
        }
      }

      return { q, answerText, selectedOptionId, marksObtained: 0, feedback: 'Unattempted.' }
    })
  )

  // 4) persist marks + feedback on answers
  for (const e of evaluations) {
    const existing = answerByQuestion.get(e.q.id)
    if (existing) {
      await db.answer.update({
        where: { id: existing.id },
        data: { marksObtained: e.marksObtained, feedback: e.feedback },
      })
    } else {
      await db.answer.create({
        data: {
          questionId: e.q.id,
          studentId: user.id,
          testId: test.id,
          answerText: e.answerText,
          selectedOptionId: e.selectedOptionId,
          marksObtained: e.marksObtained,
          feedback: e.feedback,
        },
      })
    }
  }

  // 5) totals
  const obtained = round2(evaluations.reduce((sum, e) => sum + e.marksObtained, 0))
  const total = round2(questions.reduce((sum, q) => sum + q.marks, 0))
  const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0
  const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F'
  const passStatus = percentage >= 40

  // 6) weak / strong areas by topic
  const weakAreas: string[] = []
  const strongAreas: string[] = []
  const seenWeak = new Set<string>()
  const seenStrong = new Set<string>()
  for (const e of evaluations) {
    if (e.q.marks <= 0) continue
    const ratio = e.marksObtained / e.q.marks
    const label = e.q.topicName ?? e.q.questionText.slice(0, 40)
    if (ratio < 0.4 && !seenWeak.has(label)) {
      weakAreas.push(label)
      seenWeak.add(label)
    } else if (ratio >= 0.8 && !seenStrong.has(label)) {
      strongAreas.push(label)
      seenStrong.add(label)
    }
  }

  // 7) AI improvement suggestions
  const improvementSuggestions = await generateImprovementSuggestions(
    subjectName,
    percentage,
    weakAreas
  )

  // 8) upsert Result (replace any stale row)
  await db.result.deleteMany({ where: { testId: test.id } })
  await db.result.create({
    data: {
      testId: test.id,
      studentId: user.id,
      totalMarks: total,
      obtainedMarks: obtained,
      percentage,
      grade,
      passStatus,
      analytics: JSON.stringify({
        improvement_suggestions: improvementSuggestions,
        weak_areas: weakAreas,
        strong_areas: strongAreas,
      }),
    },
  })

  // 9) mark evaluated
  await db.mockTest.update({
    where: { id: test.id },
    data: { status: 'EVALUATED', totalMarks: total },
  })

  // 10) build response — correct answers ARE visible after submission
  const question_results: QuestionResult[] = evaluations.map(e => ({
    question_id: e.q.id,
    question_text: e.q.questionText,
    question_type: e.q.questionType as QuestionResult['question_type'],
    marks: e.q.marks,
    student_answer: e.answerText,
    selected_option_id: e.selectedOptionId,
    correct_option_id: e.q.questionType === 'MCQ' ? e.q.correctAnswer : null,
    marks_obtained: e.marksObtained,
    feedback: e.feedback,
    explanation: e.q.explanation,
  }))

  const payload: ExamResult = {
    test_id: test.id,
    subject: subjectName,
    test_type: test.testType,
    percentage,
    obtained_marks: obtained,
    total_marks: total,
    grade,
    analytics: {
      improvement_suggestions: improvementSuggestions,
      weak_areas: weakAreas,
      strong_areas: strongAreas,
    },
    question_results,
  }

  return Response.json(payload)
}
