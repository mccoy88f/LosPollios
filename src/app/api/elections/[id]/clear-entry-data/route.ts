import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { clearElectionEntryData } from '@/lib/clearElectionEntryData'
import { ssePublish } from '@/lib/sse'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { id } = await params
  const electionId = Number(id)
  if (!Number.isFinite(electionId)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: { id: true },
  })
  if (!election) {
    return NextResponse.json({ error: 'Elezione non trovata' }, { status: 404 })
  }

  const cleared = await clearElectionEntryData(electionId)
  ssePublish(electionId, { type: 'section_updated', sectionId: 0, by: session.username })

  return NextResponse.json({ ok: true, cleared })
}
