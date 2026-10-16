import { NextRequest } from 'next/server'
import { getAuthUser, unauthorized } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  return Response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    enrollmentNo: user.enrollmentNo,
    semester: user.semester,
    department: user.department,
    examDate: user.examDate ? user.examDate.toISOString() : null,
  })
}
