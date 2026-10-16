import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { getVisibleSubjects } from '@/app/api/lib/compute'
import type { Subject } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/subjects — subjects the user can SEE:
 * 'own' (created from their uploads / added manually) and 'classroom'
 * (shared by a faculty through an enrolled classroom), with unit/topic/
 * question counts. A fresh student correctly gets [].
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const visible = await getVisibleSubjects(user.id)
  if (visible.length === 0) return Response.json([])

  const ids = visible.map(s => s.id)

  // unit + topic counts in one pass (topics via unit._count)
  const unitRows = await db.unit.findMany({
    where: { subjectId: { in: ids } },
    select: { subjectId: true, _count: { select: { topics: true } } },
  })
  const unitCount = new Map<string, number>()
  const topicCount = new Map<string, number>()
  for (const u of unitRows) {
    unitCount.set(u.subjectId, (unitCount.get(u.subjectId) ?? 0) + 1)
    topicCount.set(u.subjectId, (topicCount.get(u.subjectId) ?? 0) + u._count.topics)
  }

  // ACTIVE question counts
  const questionRows = await db.question.groupBy({
    by: ['subjectId'],
    where: { subjectId: { in: ids }, status: 'ACTIVE' },
    _count: { _all: true },
  })
  const questionCount = new Map(questionRows.map(q => [q.subjectId, q._count._all]))

  // classroom names for shared subjects
  const classroomIds = Array.from(
    new Set(visible.map(s => s.classroomId).filter(cid => !!cid))
  ) as string[]
  const classrooms = classroomIds.length
    ? await db.classroom.findMany({ where: { id: { in: classroomIds } }, select: { id: true, name: true } })
    : []
  const classroomNameById = new Map(classrooms.map(c => [c.id, c.name]))

  const payload: Subject[] = visible.map(s => {
    const own = s.ownerId === user.id
    const source: Subject['source'] = own ? 'own' : 'classroom'
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      description: s.description,
      source,
      classroomName: !own && s.classroomId ? classroomNameById.get(s.classroomId) ?? null : null,
      units: unitCount.get(s.id) ?? 0,
      topics: topicCount.get(s.id) ?? 0,
      questions: questionCount.get(s.id) ?? 0,
    }
  })

  return Response.json(payload)
}

/**
 * POST /api/subjects — manual "Add New Subject". Always owned by the
 * current user (both roles); 409 when they already have one with the
 * same name (case-insensitive) so the AI pipeline can merge into it.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  let body: { name?: string; code?: string; description?: string }
  try {
    body = (await req.json()) as { name?: string; code?: string; description?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  if (!name) return Response.json({ error: 'Subject name is required' }, { status: 400 })
  if (name.length > 80) {
    return Response.json({ error: 'Subject name is too long' }, { status: 400 })
  }

  const owned = await db.subject.findMany({ where: { ownerId: user.id }, select: { name: true } })
  if (owned.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    return Response.json(
      { error: 'You already have a subject with this name' },
      { status: 409 }
    )
  }

  // code defaults to first 3 uppercase letters of name + 2 random digits
  const defaultCode =
    name.replace(/\s+/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X') +
    String(Math.floor(10 + Math.random() * 90))

  const subject = await db.subject.create({
    data: {
      name,
      code: (body.code || '').trim() || defaultCode,
      description: (body.description || '').trim() || 'Added by user',
      ownerId: user.id,
      classroomId: null,
    },
  })

  const payload: Subject = {
    id: subject.id,
    name: subject.name,
    code: subject.code,
    description: subject.description,
    source: 'own',
    classroomName: null,
    units: 0,
    topics: 0,
    questions: 0,
  }
  return Response.json(payload, { status: 201 })
}
