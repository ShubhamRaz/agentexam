import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { signToken, verifyPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = (await req.json()) as { email?: string; password?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const access_token = await signToken(user.id, user.role)
  return Response.json({
    access_token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      enrollmentNo: user.enrollmentNo,
      semester: user.semester,
      department: user.department,
      examDate: user.examDate ? user.examDate.toISOString() : null,
    },
  })
}
