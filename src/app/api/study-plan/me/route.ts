import { NextRequest } from 'next/server'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { getOrCreateStudyPlan, mapPlanToData } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const plan = await getOrCreateStudyPlan(user.id)
  return Response.json(mapPlanToData(plan))
}
