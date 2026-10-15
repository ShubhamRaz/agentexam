import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/subjects/[id] — owner only. Cascades the subject away with
 * all its units/topics/questions/materials/experiments (Prisma cascades)
 * plus any MockTests referencing it (MockTest.subjectId is a plain string
 * FK, so those are removed explicitly; answers/results cascade from the
 * tests).
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const subject = await db.subject.findUnique({ where: { id } })
  if (!subject) return Response.json({ error: 'Subject not found' }, { status: 404 })
  if (subject.ownerId !== user.id) {
    return Response.json({ error: 'Only the subject owner can delete it' }, { status: 403 })
  }

  await db.mockTest.deleteMany({ where: { subjectId: id } })
  await db.subject.delete({ where: { id } })

  return Response.json({ ok: true })
}
