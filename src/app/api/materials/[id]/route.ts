import { NextRequest } from 'next/server'
import fs from 'fs/promises'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/materials/[id] — remove a material (row + stored file).
 * Allowed for the uploader, the subject owner, or the faculty that owns
 * the classroom the subject lives in.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await params
  const material = await db.material.findUnique({
    where: { id },
    include: { subject: { select: { id: true, ownerId: true, classroomId: true } } },
  })
  if (!material) {
    return Response.json({ error: 'Material not found' }, { status: 404 })
  }

  let allowed = material.uploadedBy === user.id
  if (!allowed && material.subject) {
    allowed = material.subject.ownerId === user.id
  }
  if (!allowed && material.subject?.classroomId) {
    const classroom = await db.classroom.findUnique({
      where: { id: material.subject.classroomId },
      select: { facultyId: true },
    })
    allowed = classroom?.facultyId === user.id
  }
  if (!allowed) {
    return Response.json({ error: 'Not allowed to delete this material' }, { status: 403 })
  }

  if (material.filePath) {
    await fs.unlink(material.filePath).catch(() => undefined)
  }

  const deleteSubjectParam = req.nextUrl.searchParams.get('deleteSubject') === 'true'
  if (deleteSubjectParam && material.subjectId) {
    const subject = await db.subject.findUnique({
      where: { id: material.subjectId },
      include: { materials: { select: { filePath: true } } },
    })
    if (subject) {
      for (const m of subject.materials) {
        if (m.filePath) await fs.unlink(m.filePath).catch(() => undefined)
      }
      const tests = await db.mockTest.findMany({ where: { subjectId: subject.id }, select: { id: true } })
      const testIds = tests.map(t => t.id)
      if (testIds.length > 0) {
        await db.result.deleteMany({ where: { testId: { in: testIds } } })
        await db.answer.deleteMany({ where: { testId: { in: testIds } } })
        await db.mockTest.deleteMany({ where: { id: { in: testIds } } })
      }
      const questions = await db.question.findMany({ where: { subjectId: subject.id }, select: { id: true } })
      const questionIds = questions.map(q => q.id)
      if (questionIds.length > 0) {
        await db.answer.deleteMany({ where: { questionId: { in: questionIds } } })
        await db.question.deleteMany({ where: { id: { in: questionIds } } })
      }
      const units = await db.unit.findMany({ where: { subjectId: subject.id }, select: { id: true } })
      const unitIds = units.map(u => u.id)
      if (unitIds.length > 0) {
        await db.topic.deleteMany({ where: { unitId: { in: unitIds } } })
        await db.unit.deleteMany({ where: { id: { in: unitIds } } })
      }
      await db.experiment.deleteMany({ where: { subjectId: subject.id } })
      await db.material.deleteMany({ where: { subjectId: subject.id } })
      await db.subject.delete({ where: { id: subject.id } })
      return Response.json({ ok: true, deletedSubjectId: subject.id })
    }
  }

  await db.material.delete({ where: { id } })

  return Response.json({ ok: true })
}
