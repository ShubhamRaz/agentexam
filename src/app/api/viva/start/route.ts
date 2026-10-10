import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { shuffle, round2 } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  let body: { subject_id?: string }
  try {
    body = (await req.json()) as { subject_id?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const subjectId = body.subject_id || ''
  if (!subjectId) {
    return Response.json({ error: 'subject_id is required' }, { status: 400 })
  }

  const subject = await db.subject.findUnique({ where: { id: subjectId } })
  if (!subject) return Response.json({ error: 'Subject not found' }, { status: 404 })

  const vivaQuestions = await db.question.findMany({
    where: { subjectId, questionType: 'VIVA', status: 'ACTIVE' },
    select: { id: true, questionText: true, marks: true },
  })

  if (vivaQuestions.length === 0) {
    return Response.json(
      { error: 'No viva questions available for this subject' },
      { status: 400 }
    )
  }

  // pick up to 5 random viva questions
  const selected = shuffle(vivaQuestions).slice(0, 5)
  const totalMarks = round2(selected.reduce((sum, q) => sum + q.marks, 0))

  const now = new Date()
  const test = await db.mockTest.create({
    data: {
      studentId: user.id,
      subjectId: subject.id,
      testType: 'VIVA',
      difficultyLevel: 'MEDIUM',
      totalMarks,
      durationMinutes: 15,
      status: 'IN_PROGRESS',
      questionIds: JSON.stringify(selected.map(q => q.id)),
      startedAt: now,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    },
  })

  return Response.json(
    {
      id: test.id,
      questions: selected.map(q => ({
        id: q.id,
        question_text: q.questionText,
        marks: q.marks,
      })),
    },
    { status: 201 }
  )
}
