import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const subjects = await db.subject.findMany({ orderBy: { name: 'asc' } })
  return Response.json(
    subjects.map(s => ({ id: s.id, name: s.name, code: s.code, description: s.description }))
  )
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  let body: { name?: string; code?: string; description?: string }
  try {
    body = (await req.json()) as { name?: string; code?: string; description?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  if (!name) return Response.json({ error: 'Subject name is required' }, { status: 400 })

  // code defaults to first 3 uppercase letters of name + 2 random digits
  const defaultCode =
    name.replace(/\s+/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X') +
    String(Math.floor(10 + Math.random() * 90))

  const subject = await db.subject.create({
    data: {
      name,
      code: (body.code || '').trim() || defaultCode,
      description: (body.description || '').trim() || 'Added by user',
    },
  })

  return Response.json(
    { id: subject.id, name: subject.name, code: subject.code, description: subject.description },
    { status: 201 }
  )
}
