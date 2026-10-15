import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized, hashPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/classrooms/[id]/students — faculty owner only. Adds a student
 * by email; creates the account (temp password "student123") when it does
 * not exist yet. 409 when already enrolled, 400 for faculty accounts.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const classroom = await db.classroom.findUnique({ where: { id } })
  if (!classroom) return Response.json({ error: 'Classroom not found' }, { status: 404 })
  if (classroom.facultyId !== user.id) {
    return Response.json({ error: 'Only the classroom owner can add students' }, { status: 403 })
  }

  let body: { email?: string; name?: string }
  try {
    body = (await req.json()) as { email?: string; name?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'A valid student email is required' }, { status: 400 })
  }

  let student
  let tempPassword: string | null = null
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    if (existing.role === 'FACULTY') {
      return Response.json(
        { error: 'This email belongs to a faculty account — students only' },
        { status: 400 }
      )
    }
    student = existing
  } else {
    const name = (body.name || '').trim() || email.split('@')[0]
    student = await db.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword('student123'),
        role: 'STUDENT',
        semester: '5',
        ...(user.department ? { department: user.department } : {}),
        examDate: new Date(Date.now() + 45 * 24 * 3600 * 1000),
      },
    })
    tempPassword = 'student123'
  }

  const already = await db.classroomStudent.findUnique({
    where: { classroomId_studentId: { classroomId: id, studentId: student.id } },
  })
  if (already) {
    return Response.json({ error: 'Student is already enrolled in this classroom' }, { status: 409 })
  }

  const enrollment = await db.classroomStudent.create({
    data: { classroomId: id, studentId: student.id },
  })

  return Response.json(
    {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        addedAt: enrollment.addedAt.toISOString(),
        testsCompleted: 0,
        averageScore: null,
        lastActive: null,
      },
      tempPassword,
    },
    { status: 201 }
  )
}
