import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getElectionLastDataUpdateAt, getElectionUpdateFeed } from '@/lib/electionUpdates'

type Params = { params: Promise<{ id: string }> }

/**
 * Feed aggiornamenti spoglio: affluenza, voti lista e preferenze con timestamp DB e utente (enteredBy).
 * Pubblico come GET /results per la live.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const electionId = Number((await params).id)
  if (!Number.isFinite(electionId)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: { id: true, name: true, commune: true },
  })
  if (!election) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const [lastDataUpdateAt, events] = await Promise.all([
    getElectionLastDataUpdateAt(electionId),
    getElectionUpdateFeed(electionId),
  ])

  return NextResponse.json({
    election,
    serverTime: new Date().toISOString(),
    lastDataUpdateAt,
    events,
  })
}
