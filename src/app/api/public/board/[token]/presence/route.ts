import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  countActivePublicBoardViewers,
  touchPublicBoardPresence,
} from '@/lib/publicBoardPresence'

type Params = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params
  const boardToken = token?.trim()
  if (!boardToken) {
    return NextResponse.json({ error: 'Token mancante' }, { status: 400 })
  }

  const election = await prisma.election.findFirst({
    where: { publicBoardToken: boardToken, publicBoardEnabled: true },
    select: { id: true },
  })
  if (!election) {
    return NextResponse.json({ error: 'Tabellone non disponibile' }, { status: 404 })
  }

  let clientId = ''
  try {
    const body = await req.json()
    clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : ''
  } catch {
    /* body opzionale */
  }

  if (!clientId) {
    return NextResponse.json({ error: 'clientId obbligatorio' }, { status: 400 })
  }

  await touchPublicBoardPresence(boardToken, clientId)
  const activeViewers = await countActivePublicBoardViewers(boardToken)

  return NextResponse.json({ ok: true, activeViewers })
}
