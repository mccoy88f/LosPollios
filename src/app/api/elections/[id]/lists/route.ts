import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const lists = await prisma.electionList.findMany({
    where: { electionId: Number(id) },
    orderBy: { order: 'asc' },
    include: { candidates: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(lists)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id } = await params
  const { name, shortName, color, candidateMayor, coalition, order, notes } = await req.json()

  const list = await prisma.electionList.create({
    data: {
      electionId: Number(id),
      name,
      shortName,
      color: color ?? '#6366f1',
      candidateMayor,
      coalition,
      order: Number(order ?? 0),
      notes,
    },
  })
  return NextResponse.json(list, { status: 201 })
}
