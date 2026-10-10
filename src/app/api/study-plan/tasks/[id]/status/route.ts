import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface PlanTaskJson {
  id: string
  title: string
  subject: string
  type: string
  priority: string
  duration?: number
  completed?: boolean
}

interface PlanJson {
  days: { date: string; tasks: PlanTaskJson[] }[]
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await ctx.params

  let body: { status?: string }
  try {
    body = (await req.json()) as { status?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const status = body.status
  if (status !== 'completed' && status !== 'pending') {
    return Response.json({ error: "status must be 'completed' or 'pending'" }, { status: 400 })
  }

  const plan = await db.studyPlan.findFirst({
    where: { studentId: user.id, status: 'ACTIVE' },
  })
  if (!plan) {
    return Response.json({ error: 'No active study plan found' }, { status: 404 })
  }

  let parsed: PlanJson
  try {
    parsed = JSON.parse(plan.planJson || '{}') as PlanJson
  } catch {
    return Response.json({ error: 'Study plan data is corrupted' }, { status: 500 })
  }

  let found = false
  for (const day of parsed.days || []) {
    for (const task of day.tasks || []) {
      if (String(task.id) === id) {
        task.completed = status === 'completed'
        found = true
      }
    }
  }
  if (!found) {
    return Response.json({ error: 'Task not found in study plan' }, { status: 404 })
  }

  await db.studyPlan.update({
    where: { id: plan.id },
    data: { planJson: JSON.stringify(parsed) },
  })

  return Response.json({ ok: true })
}
