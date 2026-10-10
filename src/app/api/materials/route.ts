import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { mapMaterial } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const materials = await db.material.findMany({
    where: { uploadedBy: user.id },
    include: { subject: true },
    orderBy: { createdAt: 'desc' }, // newest first
  })

  return Response.json(materials.map(mapMaterial))
}
