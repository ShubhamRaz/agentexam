import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { getVisibleSubjects, mapMaterial } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

/**
 * GET /api/materials — every material attached to a subject the user can
 * see (their own uploads + subjects shared through enrolled classrooms).
 * `uploadedByName` is only set when someone ELSE uploaded the material.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const visible = await getVisibleSubjects(user.id)
  const visibleIds = visible.map(s => s.id)

  const materials = visibleIds.length
    ? await db.material.findMany({
        where: { subjectId: { in: visibleIds } },
        include: { subject: true },
        orderBy: { createdAt: 'desc' }, // newest first
      })
    : []

  // batch-resolve uploader names
  const uploaderIds = Array.from(new Set(materials.map(m => m.uploadedBy)))
  const uploaders = uploaderIds.length
    ? await db.user.findMany({ where: { id: { in: uploaderIds } }, select: { id: true, name: true } })
    : []
  const uploaderById = new Map(uploaders.map(u => [u.id, u.name]))

  return Response.json(
    materials.map(m =>
      mapMaterial(m, m.uploadedBy === user.id ? undefined : uploaderById.get(m.uploadedBy))
    )
  )
}
