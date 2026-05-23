import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { revokeUserSession } from '@/lib/userSession'

type Params = { params: Promise<{ sessionId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { sessionId } = await params
  if (sessionId === session.sessionId) {
    return NextResponse.json(
      { error: 'Non puoi disconnettere la sessione che stai usando. Usa Esci dal menu.' },
      { status: 400 }
    )
  }

  const ok = await revokeUserSession(sessionId)
  if (!ok) {
    return NextResponse.json({ error: 'Sessione non trovata o già terminata' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
