import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const elections = await prisma.election.findMany({
    orderBy: { date: 'desc' },
    include: {
      _count: { select: { sections: true, lists: true } },
    },
  })
  return NextResponse.json(elections)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const body = await req.json()
  const { name, commune, date, type, totalSeats, threshold, notes, eligibleVotersTotal } = body

  if (!name || !commune || !date) {
    return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
  }

  const cap =
    eligibleVotersTotal === undefined || eligibleVotersTotal === null || eligibleVotersTotal === ''
      ? null
      : Math.max(0, Number(eligibleVotersTotal))

  const election = await prisma.election.create({
    data: {
      name,
      commune,
      date: new Date(date),
      type: type ?? 'large',
      totalSeats: Number(totalSeats ?? 32),
      threshold: Number(threshold ?? 3.0),
      notes,
      ...(cap != null ? { eligibleVotersTotal: cap } : {}),
    },
  })
  return NextResponse.json(election, { status: 201 })
}
