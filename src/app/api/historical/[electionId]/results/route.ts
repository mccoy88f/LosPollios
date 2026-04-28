import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ electionId: string }> }

/** POST: nuova riga lista (macro) per un’elezione storica */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { electionId: idStr } = await params
  const electionId = Number(idStr)
  if (!Number.isFinite(electionId)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  const election = await prisma.historicalElection.findUnique({ where: { id: electionId } })
  if (!election) {
    return NextResponse.json({ error: 'Elezione storica non trovata' }, { status: 404 })
  }

  let body: { listName?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const listName = String(body.listName ?? '').trim() || 'Nuova lista'

  const row = await prisma.historicalListResult.create({
    data: {
      electionId,
      listName,
      votes: 0,
      percentage: 0,
      coalition: null,
      candidateMayor: null,
      seats: null,
      mayorPersonId: null,
      listLogoUrl: null,
      coalitionLogoUrl: null,
      notes: null,
    },
    include: {
      mayorPerson: true,
      councilCandidates: { orderBy: [{ order: 'asc' }, { id: 'asc' }], include: { person: true } },
    },
  })

  return NextResponse.json(row, { status: 201 })
}
