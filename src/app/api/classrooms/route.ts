import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { buildClassroomSummaries } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

// 6-char join code, unambiguous charset (no I/O/0/1)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    }
    const clash = await db.classroom.findUnique({ where: { code } })
    if (!clash) return code
  }
  return `C${Date.now().toString(36).toUpperCase().slice(-5)}` // practical fallback
}

/**
 * GET /api/classrooms — FACULTY: classrooms they run; STUDENT: classrooms
 * they are enrolled in. Both mapped to ClassroomSummary[].
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  let classrooms
  if (user.role === 'FACULTY') {
    classrooms = await db.classroom.findMany({
      where: { facultyId: user.id },
      orderBy: { createdAt: 'desc' },
    })
  } else {
    const enrollments = await db.classroomStudent.findMany({
      where: { studentId: user.id },
      select: { classroomId: true },
    })
    const ids = enrollments.map(e => e.classroomId)
    classrooms = ids.length
      ? await db.classroom.findMany({ where: { id: { in: ids } }, orderBy: { createdAt: 'desc' } })
      : []
  }

  return Response.json(await buildClassroomSummaries(classrooms))
}

/** POST /api/classrooms — FACULTY only: create a classroom. */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()
  if (user.role !== 'FACULTY') {
    return Response.json({ error: 'Only faculty can create classrooms' }, { status: 403 })
  }

  let body: { name?: string }
  try {
    body = (await req.json()) as { name?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  if (!name) return Response.json({ error: 'Classroom name is required' }, { status: 400 })
  if (name.length > 80) {
    return Response.json({ error: 'Classroom name is too long' }, { status: 400 })
  }

  const code = await generateUniqueCode()
  const classroom = await db.classroom.create({
    data: { name, code, facultyId: user.id },
  })

  return Response.json(
    {
      id: classroom.id,
      name: classroom.name,
      code: classroom.code,
      createdAt: classroom.createdAt.toISOString(),
      studentCount: 0,
      subjectCount: 0,
      materialCount: 0,
    },
    { status: 201 }
  )
}
