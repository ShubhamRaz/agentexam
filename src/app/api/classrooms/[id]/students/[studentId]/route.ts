import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/classrooms/[id]/students/[studentId] — faculty owner only.
 * Removes the enrollment (the student account itself is untouched).
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; studentId: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id, studentId } = await ctx.params
  const classroom = await db.classroom.findUnique({ where: { id } })
  if (!classroom) return Response.json({ error: 'Classroom not found' }, { status: 404 })
  if (classroom.facultyId !== user.id) {
    return Response.json({ error: 'Only the classroom owner can remove students' }, { status: 403 })
  }

  const deleted = await db.classroomStudent.deleteMany({
    where: { classroomId: id, studentId },
  })
  if (deleted.count === 0) {
    return Response.json({ error: 'Student is not enrolled in this classroom' }, { status: 404 })
  }

  return Response.json({ ok: true })
}
