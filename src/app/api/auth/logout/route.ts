import { NextResponse } from 'next/server'
import { clearTokenCookie, getSession } from '@/lib/auth'
import { revokeUserSession } from '@/lib/userSession'

export async function POST() {
  const session = await getSession()
  if (session?.sessionId) {
    await revokeUserSession(session.sessionId)
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(clearTokenCookie())
  return res
}
