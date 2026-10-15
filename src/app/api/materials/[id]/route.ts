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
  await db.material.delete({ where: { id } })

  return Response.json({ ok: true })
}
