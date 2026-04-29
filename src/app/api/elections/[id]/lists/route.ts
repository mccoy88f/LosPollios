import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { normalizeFullNameLabel } from '@/lib/personUtils'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const lists = await prisma.electionList.findMany({
    where: { electionId: Number(id) },
    orderBy: { order: 'asc' },
    include: {
      mayorPerson: true,
      candidates: { orderBy: { order: 'asc' }, include: { person: true } },
    },
  })
  return NextResponse.json(lists)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id } = await params
  const { name, shortName, color, listLogoUrl, coalitionLogoUrl, candidateMayor, mayorPersonId, coalition, order, notes } =
    await req.json()

  const list = await prisma.electionList.create({
    data: {
      electionId: Number(id),
      name,
      shortName,
      color: color ?? '#6366f1',
      listLogoUrl: listLogoUrl?.trim() || null,
      coalitionLogoUrl: coalitionLogoUrl?.trim() || null,
      candidateMayor: normalizeFullNameLabel(candidateMayor),
      mayorPersonId: mayorPersonId != null && mayorPersonId !== '' ? Number(mayorPersonId) : null,
      coalition,
      order: Number(order ?? 0),
      notes,
    },
  })
  return NextResponse.json(list, { status: 201 })
}
