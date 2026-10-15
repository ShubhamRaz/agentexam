import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { buildClassroomSummaries, conductedTestKey, round1 } from '@/app/api/lib/compute'
import type { FacultyDashboardData } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/faculty/dashboard — FACULTY only. Aggregate stats, classroom
 * summaries and the last ~8 events across their students.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()
  if (user.role !== 'FACULTY') {
    return Response.json({ error: 'Faculty access only' }, { status: 403 })
  }

  const classrooms = await db.classroom.findMany({
    where: { facultyId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  const classroomIds = classrooms.map(c => c.id)
  const classroomNameById = new Map(classrooms.map(c => [c.id, c.name]))

  const enrollments = classroomIds.length
    ? await db.classroomStudent.findMany({ where: { classroomId: { in: classroomIds } } })
    : []
  const enrolledIds = Array.from(new Set(enrollments.map(e => e.studentId)))
  const enrolledUsers = enrolledIds.length
    ? await db.user.findMany({ where: { id: { in: enrolledIds } }, select: { id: true, name: true } })
    : []
  const studentNameById = new Map(enrolledUsers.map(u => [u.id, u.name]))

  const subjects = await db.subject.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  })
  const subjectIds = subjects.map(s => s.id)
  const subjectNameById = new Map(subjects.map(s => [s.id, s.name]))
  const materialCount = subjectIds.length
    ? await db.material.count({ where: { subjectId: { in: subjectIds } } })
    : 0

  // conducted test groups (assignedTitle + subject + createdAt minute)
  const assigned = subjectIds.length
    ? await db.mockTest.findMany({
        where: { assignedById: user.id },
        select: { assignedTitle: true, subjectId: true, createdAt: true },
      })
    : []
  const conductedGroups = new Set(assigned.map(t => conductedTestKey(t)))

  // average score across results of tests they assigned OR tests on their subjects
  const results = await db.result.findMany({
    where: {
      test: { OR: [{ assignedById: user.id }, ...(subjectIds.length ? [{ subjectId: { in: subjectIds } }] : [])] },
    },
    select: { percentage: true },
  })
  const averageScore = results.length
    ? round1(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
    : null

  const summaries = await buildClassroomSummaries(classrooms)

  /* ---------- recent activity (last 8 events across their students) ---------- */
  type Activity = { id: string; title: string; detail: string; time: string }
  const events: Activity[] = []

  // tests submitted/evaluated by their students
  const studentTests = enrolledIds.length
    ? await db.mockTest.findMany({
        where: {
          studentId: { in: enrolledIds },
          OR: [
            { assignedById: user.id },
            ...(subjectIds.length ? [{ subjectId: { in: subjectIds } }] : []),
          ],
        },
        include: { result: true },
        orderBy: { createdAt: 'desc' },
        take: 40,
      })
    : []
  for (const t of studentTests) {
    const name = studentNameById.get(t.studentId) ?? 'Student'
    const subjectName = subjectNameById.get(t.subjectId) ?? 'a subject'
    const testTitle = t.assignedTitle ?? `${subjectName} Mock Test`
    if (t.status === 'EVALUATED' && t.result) {
      events.push({
        id: `test-${t.id}`,
        title: `${name} submitted "${testTitle}"`,
        detail: `Scored ${Math.round(t.result.percentage)}% in ${subjectName}`,
        time: (t.submittedAt ?? t.result.createdAt).toISOString(),
      })
    } else if (t.status === 'IN_PROGRESS') {
      events.push({
        id: `test-${t.id}`,
        title: `${name} started "${testTitle}"`,
        detail: `In progress — ${subjectName}`,
        time: (t.startedAt ?? t.createdAt).toISOString(),
      })
    }
  }

  // materials landing on their subjects
  const materials = subjectIds.length
    ? await db.material.findMany({
        where: { subjectId: { in: subjectIds } },
        select: { id: true, title: true, uploadedBy: true, subjectId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    : []
  const uploaderIds = Array.from(new Set(materials.map(m => m.uploadedBy)))
  const uploaders = uploaderIds.length
    ? await db.user.findMany({ where: { id: { in: uploaderIds } }, select: { id: true, name: true } })
    : []
  const uploaderNameById = new Map(uploaders.map(u => [u.id, u.name]))
  for (const m of materials) {
    const uploader = uploaderNameById.get(m.uploadedBy) ?? 'Someone'
    const own = m.uploadedBy === user.id
    events.push({
      id: `material-${m.id}`,
      title: own ? `You uploaded "${m.title}"` : `${uploader} uploaded "${m.title}"`,
      detail: `${subjectNameById.get(m.subjectId ?? '') ?? 'Subject'} material`,
      time: m.createdAt.toISOString(),
    })
  }

  // students joining their classrooms
  for (const e of enrollments) {
    events.push({
      id: `enroll-${e.id}`,
      title: `${studentNameById.get(e.studentId) ?? 'Student'} joined ${classroomNameById.get(e.classroomId) ?? 'a classroom'}`,
      detail: 'Student added to classroom',
      time: e.addedAt.toISOString(),
    })
  }

  events.sort((a, b) => b.time.localeCompare(a.time))
  const recentActivity = events.slice(0, 8)

  const payload: FacultyDashboardData = {
    facultyName: user.name,
    stats: {
      classrooms: classrooms.length,
      students: enrolledIds.length,
      subjects: subjects.length,
      materials: materialCount,
      testsConducted: conductedGroups.size,
      averageScore,
    },
    classrooms: summaries,
    recentActivity,
  }
  return Response.json(payload)
}
