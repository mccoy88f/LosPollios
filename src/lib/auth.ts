import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { isUserSessionActive, touchUserSession } from '@/lib/userSession'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-please-set-env'
)
const COOKIE = 'lospollios_token'

export interface JwtPayload {
  sessionId: string
  userId: number
  username: string
  role: string
  electionId?: number
  listId?: number
  /** Se definito e non vuoto: solo queste sezioni per inserimento */
  allowedSectionIds?: number[]
}

export async function requireSession(): Promise<JwtPayload> {
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return session
}

export async function requireAdmin(): Promise<JwtPayload> {
  const session = await requireSession()
  if (session.role !== 'admin') throw new Error('FORBIDDEN')
  return session
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

async function resolveSession(token: string | undefined): Promise<JwtPayload | null> {
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload?.sessionId) return null
  if (!(await isUserSessionActive(payload.sessionId))) return null
  void touchUserSession(payload.sessionId).catch(() => {})
  return payload
}

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies()
  return resolveSession(cookieStore.get(COOKIE)?.value)
}

/** Solo JWT (middleware Edge): non verifica revoca sessione su DB. */
export async function getSessionFromRequest(req: NextRequest): Promise<JwtPayload | null> {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload?.sessionId) return null
  return payload
}

/** JWT + sessione attiva su DB (API e server components). */
export async function getSessionFromRequestStrict(req: NextRequest): Promise<JwtPayload | null> {
  return resolveSession(req.cookies.get(COOKIE)?.value)
}

export function setTokenCookie(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24,
    path: '/',
  }
}

export function clearTokenCookie() {
  return { name: COOKIE, value: '', maxAge: 0, path: '/' }
}
