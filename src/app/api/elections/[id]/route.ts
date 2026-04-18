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
  const { name, commune, date, type, totalSeats, threshold, status, notes } = body

  const election = await prisma.election.update({
    where: { id: Number(id) },
    data: {
      ...(name       && { name }),
      ...(commune    && { commune }),
      ...(date       && { date: new Date(date) }),
      ...(type       && { type }),
      ...(totalSeats !== undefined && { totalSeats: Number(totalSeats) }),
      ...(threshold  !== undefined && { threshold: Number(threshold) }),
      ...(status     && { status }),
      ...(notes      !== undefined && { notes }),
    },
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
