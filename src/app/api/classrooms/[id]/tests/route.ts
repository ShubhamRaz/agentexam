import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { shuffle, round2 } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

const EXAM_TYPES = ['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER']

/**
 * POST /api/classrooms/[id]/tests — faculty owner only. Conducts a test:
 * one shared question selection, one DRAFT MockTest row per enrolled
 * student (assignedById/assignedTitle/dueDate set).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const classroom = await db.classroom.findUnique({ where: { id } })
  if (!classroom) return Response.json({ error: 'Classroom not found' }, { status: 404 })
  if (classroom.facultyId !== user.id) {
    return Response.json({ error: 'Only the classroom owner can conduct tests' }, { status: 403 })
  }

  let body: {
    subject_id?: string
    title?: string
    question_count?: number
    duration_minutes?: number
    due_date?: string
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const subjectId = body.subject_id || ''
  const title = (body.title || '').trim()
  const questionCount = Number(body.question_count ?? 8)
  const durationMinutes = Number(body.duration_minutes ?? 30)

  if (!subjectId) return Response.json({ error: 'subject_id is required' }, { status: 400 })
  if (!title) return Response.json({ error: 'title is required' }, { status: 400 })
  if (!Number.isFinite(questionCount) || questionCount < 1) {
    return Response.json({ error: 'question_count must be a positive number' }, { status: 400 })
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1) {
    return Response.json({ error: 'duration_minutes must be a positive number' }, { status: 400 })
  }

  const subject = await db.subject.findUnique({ where: { id: subjectId } })
  if (!subject) return Response.json({ error: 'Subject not found' }, { status: 404 })
  if (subject.classroomId !== classroom.id) {
    return Response.json(
      { error: 'This subject is not part of the classroom' },
      { status: 400 }
    )
  }

  const enrollments = await db.classroomStudent.findMany({
    where: { classroomId: id },
    select: { studentId: true },
  })
  if (enrollments.length === 0) {
    return Response.json({ error: 'No students enrolled in this classroom' }, { status: 400 })
  }

  const questions = await db.question.findMany({
    where: { subjectId, status: 'ACTIVE', questionType: { in: EXAM_TYPES } },
    select: { id: true, marks: true },
  })
  if (questions.length === 0) {
    return Response.json(
      { error: 'No active questions available for this subject' },
      { status: 400 }
    )
  }

  // one shared selection (MIXED difficulty preference)
  const selected = shuffle(questions).slice(0, Math.floor(questionCount))
  const totalMarks = round2(selected.reduce((sum, q) => sum + q.marks, 0))
  const questionIds = JSON.stringify(selected.map(q => q.id))

  let dueDate: Date | null = null
  if (body.due_date) {
    const parsed = new Date(body.due_date)
    if (Number.isNaN(parsed.getTime())) {
      return Response.json({ error: 'due_date must be a valid ISO date string' }, { status: 400 })
    }
    dueDate = parsed
  }

  for (const e of enrollments) {
    await db.mockTest.create({
      data: {
        studentId: e.studentId,
        subjectId: subject.id,
        testType: 'THEORY',
        difficultyLevel: 'MIXED',
        totalMarks,
        durationMinutes: Math.floor(durationMinutes),
        status: 'DRAFT',
        questionIds,
        assignedById: user.id,
        assignedTitle: title,
        dueDate,
      },
    })
  }

  return Response.json(
    {
      conducted: enrollments.length,
      question_count: selected.length,
      total_marks: totalMarks,
      title,
    },
    { status: 201 }
  )
}
