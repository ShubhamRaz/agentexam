import { SignJWT, jwtVerify } from 'jose'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'agentexam-dev-secret-key-change-in-production'
)
const TOKEN_EXPIRY = '7d'

// ---------- Password hashing (scrypt, no external deps) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, 'hex')
  const testBuf = scryptSync(password, salt, hashBuf.length)
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf)
}

// ---------- JWT ----------

export async function signToken(userId: string, role: string): Promise<string> {
  return new SignJWT({ sub: userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<{ sub: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (!payload.sub) return null
    return { sub: String(payload.sub), role: String(payload.role || 'STUDENT') }
  } catch {
    return null
  }
}

// ---------- Request auth helpers ----------

export async function getAuthUser(req: NextRequest) {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null
  const user = await db.user.findUnique({ where: { id: payload.sub } })
  if (!user || !user.isActive) return null
  return user
}

export function unauthorized(message = 'Not authenticated') {
  return Response.json({ error: message }, { status: 401 })
}
