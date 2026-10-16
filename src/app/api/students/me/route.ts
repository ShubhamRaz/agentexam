import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function profileShape(u: {
  id: string
  name: string
  email: string
  enrollmentNo: string | null
  semester: string | null
  department: string | null
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    enrollmentNo: u.enrollmentNo,
    semester: u.semester,
    department: u.department,
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()
  return Response.json(profileShape(user))
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  let body: {
    name?: string
    department?: string
    semester?: string
    examDate?: string | null
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data: {
    name?: string
    department?: string | null
    semester?: string | null
    examDate?: Date | null
  } = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return Response.json({ error: 'Name cannot be empty' }, { status: 400 })
    data.name = name
  }
  if (body.department !== undefined) data.department = body.department || null
  if (body.semester !== undefined) data.semester = body.semester || null
  if (body.examDate !== undefined) {
    if (body.examDate === null || body.examDate === '') {
      data.examDate = null
    } else {
      const parsed = new Date(body.examDate)
      if (Number.isNaN(parsed.getTime())) {
        return Response.json({ error: 'Invalid examDate' }, { status: 400 })
      }
      data.examDate = parsed
    }
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  const updated = await db.user.update({ where: { id: user.id }, data })
  return Response.json(profileShape(updated))
}
