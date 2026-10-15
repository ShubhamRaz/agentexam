import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import type { AssignedTest } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/exams/assigned — tests a faculty CONDUCTED for the current
 * student (assignedById set), still actionable or already evaluated.
 * Faculty users get [] (assigned tests are student-facing).
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  if (user.role === 'FACULTY') return Response.json([])

  const tests = await db.mockTest.findMany({
    where: {
      studentId: user.id,
      assignedById: { not: null },
      status: { in: ['DRAFT', 'IN_PROGRESS', 'EVALUATED'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  const subjectIds = Array.from(new Set(tests.map(t => t.subjectId)))
  const subjects = subjectIds.length
    ? await db.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } })
    : []
  const subjectNameById = new Map(subjects.map(s => [s.id, s.name]))

  const facultyIds = Array.from(
    new Set(tests.map(t => t.assignedById).filter(fid => !!fid))
  ) as string[]
  const faculties = facultyIds.length
    ? await db.user.findMany({ where: { id: { in: facultyIds } }, select: { id: true, name: true } })
    : []
  const facultyNameById = new Map(faculties.map(f => [f.id, f.name]))

  const payload: AssignedTest[] = tests.map(t => {
    let questionIds: string[] = []
    try {
      questionIds = JSON.parse(t.questionIds) as string[]
    } catch {
      questionIds = []
    }
    return {
      id: t.id,
      title: t.assignedTitle || 'Assigned Test',
      subject: subjectNameById.get(t.subjectId) ?? 'Unknown',
      assignedByName: facultyNameById.get(t.assignedById ?? '') ?? 'Faculty',
      questionCount: questionIds.length,
      totalMarks: t.totalMarks,
      durationMinutes: t.durationMinutes,
      createdAt: t.createdAt.toISOString(),
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      status: t.status as AssignedTest['status'],
    }
  })

  return Response.json(payload)
}
