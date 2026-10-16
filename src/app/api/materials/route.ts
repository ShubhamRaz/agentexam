import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { getVisibleSubjects, mapMaterial } from '@/app/api/lib/compute'
import type { Material } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** A PROCESSING material older than this is treated as failed (dev-server
 *  restarts can orphan background jobs) — the UI then offers re-analyze. */
const STALE_AFTER_MS = 10 * 60 * 1000

/**
 * GET /api/materials — every material attached to a subject the user can
 * see (their own uploads + subjects shared through enrolled classrooms),
 * plus their own uploads whose subject is still being auto-detected.
 * `uploadedByName` is only set when someone ELSE uploaded the material.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const visible = await getVisibleSubjects(user.id)
  const visibleIds = visible.map(s => s.id)

  const materials = await db.material.findMany({
    where: {
      OR: [
        ...(visibleIds.length ? [{ subjectId: { in: visibleIds } }] : []),
        { uploadedBy: user.id, subjectId: null },
      ],
    },
    include: { subject: true },
    orderBy: { createdAt: 'desc' }, // newest first
  })

  // batch-resolve uploader names
  const uploaderIds = Array.from(new Set(materials.map(m => m.uploadedBy)))
  const uploaders = uploaderIds.length
    ? await db.user.findMany({
        where: { id: { in: uploaderIds } },
        select: { id: true, name: true },
      })
    : []
  const uploaderById = new Map(uploaders.map(u => [u.id, u.name]))

  const now = Date.now()
  const mapped: Material[] = materials.map(m => {
    let material = mapMaterial(
      m,
      m.uploadedBy === user.id ? undefined : uploaderById.get(m.uploadedBy)
    )
    // stale in-flight pipeline → surface as failed so the UI offers a retry
    if (
      material.status === 'processing' &&
      now - m.createdAt.getTime() > STALE_AFTER_MS
    ) {
      material = { ...material, status: 'failed' }
    }
    return material
  })

  return Response.json(mapped)
}
