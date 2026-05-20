import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAllowedSectionIdsForUser } from '@/lib/userAccess'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const allowedSectionIds = await getAllowedSectionIdsForUser(session.userId)
  return NextResponse.json({
    user: {
      ...session,
      allowedSectionIds,
    },
  })
}
