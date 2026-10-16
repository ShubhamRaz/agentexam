import { NextRequest } from 'next/server'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { generateStudyPlan, mapPlanToData } from '@/app/api/lib/compute'

export const dynamic = 'force-dynamic'

/** Force-regenerate the study plan (archives the old one) and return it. */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const plan = await generateStudyPlan(user.id)
  return Response.json(mapPlanToData(plan))
}
