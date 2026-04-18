import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const elections = await prisma.historicalElection.findMany({
    orderBy: { year: 'desc' },
    include: { results: { orderBy: { votes: 'desc' } } },
  })
  return NextResponse.json(elections)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { name, commune, year, notes, results } = await req.json()

  const election = await prisma.historicalElection.create({
    data: {
      name,
      commune,
      year: Number(year),
      notes,
      results: results
        ? { create: results.map((r: { listName: string; coalition?: string; candidateMayor?: string; votes: number; percentage: number; seats?: number; notes?: string }) => ({
            listName:      r.listName,
            coalition:     r.coalition,
            candidateMayor: r.candidateMayor,
            votes:         Number(r.votes),
            percentage:    Number(r.percentage),
            seats:         r.seats !== undefined ? Number(r.seats) : null,
            notes:         r.notes,
          })) }
        : undefined,
    },
    include: { results: true },
  })
  return NextResponse.json(election, { status: 201 })
}
