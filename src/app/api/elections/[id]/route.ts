import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const election = await prisma.election.findUnique({
    where: { id: Number(id) },
    include: {
      sections: { orderBy: { number: 'asc' } },
      lists:    { orderBy: { order:  'asc' }, include: { candidates: { orderBy: { order: 'asc' } } } },
      _count:   { select: { sections: true, lists: true } },
    },
  })
  if (!election) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })
  return NextResponse.json(election)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const {
    name,
    commune,
    date,
    type,
    totalSeats,
    threshold,
    status,
    notes,
    archived,
    registeredVoters,
    turnoutVoters,
    turnoutPercent,
    ballotsBlank,
    ballotsInvalidInclBlank,
    eligibleVotersTotal,
  } = body

  if (archived === true) {
    const current = await prisma.election.findUnique({ where: { id: Number(id) } })
    if (!current) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })
    if (current.status !== 'closed') {
      return NextResponse.json({ error: 'Si può archiviare solo un’elezione chiusa' }, { status: 400 })
    }
  }

  const data: Record<string, unknown> = {}

  if (name !== undefined) {
    const n = String(name).trim()
    if (!n) return NextResponse.json({ error: 'Il nome non può essere vuoto' }, { status: 400 })
    data.name = n
  }
  if (commune !== undefined) {
    const c = String(commune).trim()
    if (!c) return NextResponse.json({ error: 'Il comune non può essere vuoto' }, { status: 400 })
    data.commune = c
  }
  if (date !== undefined) {
    data.date = new Date(date)
  }
  if (type !== undefined) {
    data.type = type
  }
  if (totalSeats !== undefined) {
    data.totalSeats = Number(totalSeats)
  }
  if (threshold !== undefined) {
    data.threshold = Number(threshold)
  }
  if (status !== undefined) {
    data.status = status
  }
  if (notes !== undefined) {
    data.notes = notes === null || notes === '' ? null : String(notes)
  }
  if (archived !== undefined) {
    data.archived = Boolean(archived)
  }
  if (registeredVoters !== undefined) {
    data.registeredVoters =
      registeredVoters === null || registeredVoters === '' ? null : Number(registeredVoters)
  }
  if (turnoutVoters !== undefined) {
    data.turnoutVoters =
      turnoutVoters === null || turnoutVoters === '' ? null : Number(turnoutVoters)
  }
  if (turnoutPercent !== undefined) {
    data.turnoutPercent =
      turnoutPercent === null || turnoutPercent === ''
        ? null
        : Number(String(turnoutPercent).replace(',', '.'))
  }
  if (ballotsBlank !== undefined) {
    data.ballotsBlank =
      ballotsBlank === null || ballotsBlank === '' ? null : Number(ballotsBlank)
  }
  if (ballotsInvalidInclBlank !== undefined) {
    data.ballotsInvalidInclBlank =
      ballotsInvalidInclBlank === null || ballotsInvalidInclBlank === ''
        ? null
        : Number(ballotsInvalidInclBlank)
  }
  if (eligibleVotersTotal !== undefined) {
    const cap =
      eligibleVotersTotal === null || eligibleVotersTotal === ''
        ? null
        : Math.max(0, Number(eligibleVotersTotal))
    data.eligibleVotersTotal = cap
    if (cap != null) {
      const electionId = Number(id)
      const agg = await prisma.section.aggregate({
        where: { electionId },
        _sum: { theoreticalVoters: true },
      })
      const sum = agg._sum.theoreticalVoters ?? 0
      if (sum > cap) {
        return NextResponse.json(
          {
            error: `La somma attuale sulle sezioni (${sum.toLocaleString('it-IT')}) supera il nuovo totale (${cap.toLocaleString('it-IT')}). Correggi prima le sezioni o imposta un totale più alto.`,
          },
          { status: 400 }
        )
      }
    }
  }

  const election = await prisma.election.update({
    where: { id: Number(id) },
    data: data as Parameters<typeof prisma.election.update>[0]['data'],
  })
  return NextResponse.json(election)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id } = await params
  await prisma.election.delete({ where: { id: Number(id) } })
  return NextResponse.json({ ok: true })
}
