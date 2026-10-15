import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { groupConductedTests, round1, type ConductedTestRaw } from '@/app/api/lib/compute'
import type {
  ClassroomDetail,
  ClassroomStudentRow,
  ClassroomSubjectRow,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/classrooms/[id] — full detail for the faculty owner OR an
 * enrolled student: roster with progress, shared subjects, conducted
 * tests grouped across their per-student rows.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const classroom = await db.classroom.findUnique({
    where: { id },
    include: { subjects: true },
  })
  if (!classroom) return Response.json({ error: 'Classroom not found' }, { status: 404 })

  // access: faculty owner OR enrolled student
  if (user.role === 'FACULTY') {
    if (classroom.facultyId !== user.id) {
      return Response.json({ error: 'Classroom not available' }, { status: 403 })
    }
  } else {
    const enrolled = await db.classroomStudent.findUnique({
      where: { classroomId_studentId: { classroomId: id, studentId: user.id } },
    })
    if (!enrolled) {
      return Response.json({ error: 'Classroom not available' }, { status: 403 })
    }
  }

  const subjectIds = classroom.subjects.map(s => s.id)
  const facultyUser = await db.user.findUnique({
    where: { id: classroom.facultyId },
    select: { name: true },
  })

  /* ---------- students (roster + progress on this classroom's subjects) ---------- */
  const enrollments = await db.classroomStudent.findMany({
    where: { classroomId: id },
    orderBy: { addedAt: 'asc' },
  })
  const studentIds = enrollments.map(e => e.studentId)
  const studentUsers = studentIds.length
    ? await db.user.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true, email: true } })
    : []
  const userById = new Map(studentUsers.map(u => [u.id, u]))

  const evaluatedTests = subjectIds.length
    ? await db.mockTest.findMany({
        where: {
          studentId: { in: studentIds },
          subjectId: { in: subjectIds },
          status: 'EVALUATED',
          result: { isNot: null },
        },
        include: { result: true },
      })
    : []
  // fallback "answer date" activity for students without results yet
  const answerActivity = subjectIds.length && studentIds.length
    ? await db.answer.findMany({
        where: { studentId: { in: studentIds }, test: { subjectId: { in: subjectIds } } },
        select: { studentId: true, answeredAt: true },
        orderBy: { answeredAt: 'desc' },
      })
    : []

  const statsByStudent = new Map<
    string,
    { completed: number; pctTotal: number; lastActive: Date | null }
  >()
  for (const t of evaluatedTests) {
    const cur = statsByStudent.get(t.studentId) ?? { completed: 0, pctTotal: 0, lastActive: null }
    cur.completed++
    cur.pctTotal += t.result?.percentage ?? 0
    const when = t.result?.createdAt ?? t.submittedAt
    if (when && (!cur.lastActive || when > cur.lastActive)) cur.lastActive = when
    statsByStudent.set(t.studentId, cur)
  }
  for (const a of answerActivity) {
    const cur = statsByStudent.get(a.studentId) ?? { completed: 0, pctTotal: 0, lastActive: null }
    if (!cur.lastActive || a.answeredAt > cur.lastActive) cur.lastActive = a.answeredAt
    statsByStudent.set(a.studentId, cur)
  }

  const students: ClassroomStudentRow[] = enrollments.flatMap(e => {
    const u = userById.get(e.studentId)
    if (!u) return []
    const stats = statsByStudent.get(e.studentId)
    return [
      {
        id: u.id,
        name: u.name,
        email: u.email,
        addedAt: e.addedAt.toISOString(),
        testsCompleted: stats?.completed ?? 0,
        averageScore:
          stats && stats.completed > 0 ? round1(stats.pctTotal / stats.completed) : null,
        lastActive: stats?.lastActive ? stats.lastActive.toISOString() : null,
      },
    ]
  })

  /* ---------- subjects (structure + material counts) ---------- */
  const unitRows = subjectIds.length
    ? await db.unit.findMany({
        where: { subjectId: { in: subjectIds } },
        select: { subjectId: true, _count: { select: { topics: true } } },
      })
    : []
  const unitCount = new Map<string, number>()
  const topicCount = new Map<string, number>()
  for (const u of unitRows) {
    unitCount.set(u.subjectId, (unitCount.get(u.subjectId) ?? 0) + 1)
    topicCount.set(u.subjectId, (topicCount.get(u.subjectId) ?? 0) + u._count.topics)
  }
  const questionGroups = subjectIds.length
    ? await db.question.groupBy({
        by: ['subjectId'],
        where: { subjectId: { in: subjectIds }, status: 'ACTIVE' },
        _count: { _all: true },
      })
    : []
  const questionCount = new Map(questionGroups.map(g => [g.subjectId, g._count._all]))
  const materialGroups = subjectIds.length
    ? await db.material.groupBy({
        by: ['subjectId'],
        where: { subjectId: { in: subjectIds } },
        _count: { _all: true },
      })
    : []
  const materialCount = new Map(materialGroups.map(g => [g.subjectId, g._count._all]))

  const subjects: ClassroomSubjectRow[] = classroom.subjects.map(s => ({
    id: s.id,
    name: s.name,
    code: s.code,
    units: unitCount.get(s.id) ?? 0,
    topics: topicCount.get(s.id) ?? 0,
    questions: questionCount.get(s.id) ?? 0,
    materialCount: materialCount.get(s.id) ?? 0,
  }))

  /* ---------- conducted tests (grouped across per-student rows) ---------- */
  const assignedTests: ConductedTestRaw[] = subjectIds.length
    ? await db.mockTest
        .findMany({
          where: { assignedById: classroom.facultyId, subjectId: { in: subjectIds } },
          include: { result: true },
          orderBy: { createdAt: 'asc' },
        })
        .then(rows =>
          rows.map(t => ({
            id: t.id,
            studentId: t.studentId,
            subjectId: t.subjectId,
            totalMarks: t.totalMarks,
            durationMinutes: t.durationMinutes,
            status: t.status,
            questionIds: t.questionIds,
            assignedTitle: t.assignedTitle,
            dueDate: t.dueDate,
            submittedAt: t.submittedAt,
            createdAt: t.createdAt,
            result: t.result ? { percentage: t.result.percentage } : null,
          }))
        )
    : []
  const subjectNameById = new Map(classroom.subjects.map(s => [s.id, s.name]))
  const studentNameById = new Map(studentUsers.map(u => [u.id, u.name]))
  const tests = groupConductedTests(assignedTests, studentNameById, subjectNameById)

  const payload: ClassroomDetail = {
    id: classroom.id,
    name: classroom.name,
    code: classroom.code,
    createdAt: classroom.createdAt.toISOString(),
    facultyName: facultyUser?.name ?? 'Faculty',
    students,
    subjects,
    tests,
  }
  return Response.json(payload)
}

/**
 * DELETE /api/classrooms/[id] — faculty owner only. Removes the classroom
 * (enrollments cascade); subjects are DETACHED (classroomId → null) so the
 * faculty keeps their uploaded materials and question banks.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const classroom = await db.classroom.findUnique({ where: { id } })
  if (!classroom) return Response.json({ error: 'Classroom not found' }, { status: 404 })
  if (classroom.facultyId !== user.id) {
    return Response.json({ error: 'Only the classroom owner can delete it' }, { status: 403 })
  }

  await db.subject.updateMany({ where: { classroomId: id }, data: { classroomId: null } })
  await db.classroom.delete({ where: { id } })

  return Response.json({ ok: true })
}
