import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, signToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface RegisterBody {
  name?: string
  email?: string
  password?: string
  /** optional: STUDENT (default) or FACULTY */
  role?: string
}

export async function POST(req: NextRequest) {
  let body: RegisterBody
  try {
    body = (await req.json()) as RegisterBody
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (!name || !email || !password) {
    return Response.json({ error: 'Name, email and password are required' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email address' }, { status: 400 })
  }
  if (password.length < 6) {
    return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const role = (body.role || 'STUDENT').toUpperCase()
  if (role !== 'STUDENT' && role !== 'FACULTY') {
    return Response.json({ error: 'role must be STUDENT or FACULTY' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    return Response.json({ error: 'An account with this email already exists' }, { status: 409 })
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role,
      // faculty accounts have no personal exam countdown
      examDate: role === 'STUDENT' ? new Date(Date.now() + 45 * 24 * 3600 * 1000) : null,
    },
  })

  const access_token = await signToken(user.id, user.role)
  return Response.json(
    {
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
    },
    { status: 201 }
  )
}
