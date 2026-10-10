import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { shuffle, round2 } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'MIXED']
const EXAM_TYPES = ['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER']

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  let body: {
    subject_id?: string
    difficulty?: string
    question_count?: number
    duration_minutes?: number
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const subjectId = body.subject_id || ''
  const difficulty = (body.difficulty || 'MEDIUM').toUpperCase()
  const questionCount = Number(body.question_count ?? 10)
  const durationMinutes = Number(body.duration_minutes ?? 30)

  if (!subjectId) return Response.json({ error: 'subject_id is required' }, { status: 400 })
  if (!DIFFICULTIES.includes(difficulty)) {
    return Response.json({ error: 'difficulty must be EASY, MEDIUM, HARD or MIXED' }, { status: 400 })
  }
  if (!Number.isFinite(questionCount) || questionCount < 1) {
    return Response.json({ error: 'question_count must be a positive number' }, { status: 400 })
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
    return Response.json({ error: 'duration_minutes must be a positive number' }, { status: 400 })
  }

  const subject = await db.subject.findUnique({ where: { id: subjectId } })
  if (!subject) return Response.json({ error: 'Subject not found' }, { status: 404 })

  const questions = await db.question.findMany({
    where: {
      subjectId,
      status: 'ACTIVE',
      questionType: { in: EXAM_TYPES },
    },
    select: { id: true, marks: true, difficultyLevel: true },
  })

  if (questions.length === 0) {
    return Response.json(
      { error: 'No active questions available for this subject' },
      { status: 400 }
    )
  }

  // prefer matching difficulty, fall back to the rest when not enough
  let pool
  if (difficulty === 'MIXED') {
    pool = shuffle(questions)
  } else {
    const preferred = shuffle(questions.filter(q => q.difficultyLevel === difficulty))
    const rest = shuffle(questions.filter(q => q.difficultyLevel !== difficulty))
    pool = [...preferred, ...rest]
  }

  const selected = pool.slice(0, Math.floor(questionCount))
  const totalMarks = round2(selected.reduce((sum, q) => sum + q.marks, 0))

  const test = await db.mockTest.create({
    data: {
      studentId: user.id,
      subjectId: subject.id,
      testType: 'THEORY',
      difficultyLevel: difficulty,
      totalMarks,
      durationMinutes: Math.floor(durationMinutes),
      status: 'DRAFT',
      questionIds: JSON.stringify(selected.map(q => q.id)),
    },
  })

  return Response.json(
    { id: test.id, total_marks: totalMarks, question_count: selected.length },
    { status: 201 }
  )
}
