import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ electionId: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { electionId } = await params
  const id = Number(electionId)
  const body = await req.json()
  const {
    name,
    commune,
    year,
    notes,
    registeredVoters,
    turnoutVoters,
    turnoutPercent,
    ballotsBlank,
    ballotsInvalidInclBlank,
  } = body

  const data: {
    name?: string
    commune?: string
    year?: number
    notes?: string | null
    registeredVoters?: number | null
    turnoutVoters?: number | null
    turnoutPercent?: number | null
    ballotsBlank?: number | null
    ballotsInvalidInclBlank?: number | null
  } = {}
  if (name !== undefined) {
    const v = String(name).trim()
    if (!v) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })
    data.name = v
  }
  if (commune !== undefined) {
    const v = String(commune).trim()
    if (!v) return NextResponse.json({ error: 'Comune obbligatorio' }, { status: 400 })
    data.commune = v
  }
  if (year !== undefined) {
    const y = Number(year)
    if (!Number.isFinite(y)) return NextResponse.json({ error: 'Anno non valido' }, { status: 400 })
    data.year = y
  }
  if (notes !== undefined) {
    data.notes = notes === null || notes === '' ? null : String(notes)
  }
  const numOrNull = (v: unknown): number | null => {
    if (v === null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  if ('registeredVoters' in body) data.registeredVoters = numOrNull(registeredVoters)
  if ('turnoutVoters' in body) data.turnoutVoters = numOrNull(turnoutVoters)
  if ('turnoutPercent' in body) data.turnoutPercent = numOrNull(turnoutPercent)
  if ('ballotsBlank' in body) data.ballotsBlank = numOrNull(ballotsBlank)
  if ('ballotsInvalidInclBlank' in body) data.ballotsInvalidInclBlank = numOrNull(ballotsInvalidInclBlank)

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  const election = await prisma.historicalElection.update({
    where: { id },
    data,
    include: {
      results: {
        orderBy: { votes: 'desc' },
        include: {
          mayorPerson: true,
          councilCandidates: { orderBy: [{ order: 'asc' }, { id: 'asc' }], include: { person: true } },
        },
      },
    },
  })
  return NextResponse.json(election)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { electionId } = await params
  const id = Number(electionId)
  await prisma.historicalElection.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
