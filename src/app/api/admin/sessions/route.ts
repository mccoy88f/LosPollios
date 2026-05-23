import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { listActiveUserSessions } from '@/lib/userSession'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const rows = await listActiveUserSessions()
  return NextResponse.json({
    sessions: rows.map(s => ({
      id: s.id,
      userId: s.userId,
      username: s.user.username,
      name: s.user.name,
      role: s.user.role,
      electionName: s.user.election?.name ?? null,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      lastSeenAt: s.lastSeenAt.toISOString(),
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      isCurrent: s.id === session.sessionId,
    })),
  })
}
