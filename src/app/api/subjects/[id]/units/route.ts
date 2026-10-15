import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { isSubjectVisible } from '@/app/api/lib/compute'
import type { Importance } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params
  const subject = await db.subject.findUnique({ where: { id } })
  if (!subject) return Response.json({ error: 'Subject not found' }, { status: 404 })
  if (!(await isSubjectVisible(user.id, id))) {
    return Response.json({ error: 'Subject not available' }, { status: 403 })
  }

  const units = await db.unit.findMany({
    where: { subjectId: id },
    include: { topics: true },
    orderBy: { chapterNo: 'asc' },
  })

  return Response.json(
    units.map(u => ({
      id: u.id,
      name: u.name,
      chapterNo: u.chapterNo,
      topics: [...u.topics]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(t => ({
          id: t.id,
          name: t.name,
          importance: t.importance as Importance,
          pyqFrequency: t.pyqFrequency,
          weightage: t.weightage,
        })),
    }))
  )
}
