import { NextRequest } from 'next/server'
import fs from 'fs/promises'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/subjects/[id] — Cascades the subject away with all its
 * units/topics/questions/materials/experiments and stored files,
 * plus any MockTests, answers, and results referencing it.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const subject = await db.subject.findUnique({
    where: { id },
    include: {
      materials: { select: { filePath: true } },
    },
  })
  if (!subject) return Response.json({ error: 'Subject not found' }, { status: 404 })

  let allowed = subject.ownerId === user.id
  if (!allowed && subject.classroomId) {
    const classroom = await db.classroom.findUnique({
      where: { id: subject.classroomId },
      select: { facultyId: true },
    })
    allowed = classroom?.facultyId === user.id
  }
  if (!allowed && !subject.ownerId) {
    allowed = user.role === 'FACULTY' || user.role === 'STUDENT'
  }
  if (!allowed) {
    return Response.json({ error: 'Only the subject owner can delete it' }, { status: 403 })
  }

  // 1. Remove material files from disk
  for (const m of subject.materials) {
    if (m.filePath) {
      await fs.unlink(m.filePath).catch(() => undefined)
    }
  }

  // 2. Cascade delete MockTests and related records
  const tests = await db.mockTest.findMany({
    where: { subjectId: id },
    select: { id: true },
  })
  const testIds = tests.map(t => t.id)
  if (testIds.length > 0) {
    await db.result.deleteMany({ where: { testId: { in: testIds } } })
    await db.answer.deleteMany({ where: { testId: { in: testIds } } })
    await db.mockTest.deleteMany({ where: { id: { in: testIds } } })
  }

  // 3. Cascade delete questions and related answers
  const questions = await db.question.findMany({
    where: { subjectId: id },
    select: { id: true },
  })
  const questionIds = questions.map(q => q.id)
  if (questionIds.length > 0) {
    await db.answer.deleteMany({ where: { questionId: { in: questionIds } } })
    await db.question.deleteMany({ where: { id: { in: questionIds } } })
  }

  // 4. Cascade delete units and topics
  const units = await db.unit.findMany({
    where: { subjectId: id },
    select: { id: true },
  })
  const unitIds = units.map(u => u.id)
  if (unitIds.length > 0) {
    await db.topic.deleteMany({ where: { unitId: { in: unitIds } } })
    await db.unit.deleteMany({ where: { id: { in: unitIds } } })
  }

  // 5. Delete experiments and materials
  await db.experiment.deleteMany({ where: { subjectId: id } })
  await db.material.deleteMany({ where: { subjectId: id } })

  // 6. Delete the subject itself
  await db.subject.delete({ where: { id } })

  return Response.json({ ok: true, deletedId: id })
}

