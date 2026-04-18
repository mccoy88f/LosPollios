import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string; listId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { listId } = await params
  const list = await prisma.electionList.findUnique({
    where: { id: Number(listId) },
    include: {
      mayorPerson: true,
      candidates: { orderBy: { order: 'asc' }, include: { person: true } },
    },
  })
  if (!list) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })
  return NextResponse.json(list)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { listId } = await params
  const body = await req.json()
  const list = await prisma.electionList.update({
    where: { id: Number(listId) },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.shortName !== undefined && { shortName: body.shortName }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.listLogoUrl !== undefined && { listLogoUrl: body.listLogoUrl?.trim() || null }),
      ...(body.coalitionLogoUrl !== undefined && { coalitionLogoUrl: body.coalitionLogoUrl?.trim() || null }),
      ...(body.candidateMayor !== undefined && { candidateMayor: body.candidateMayor }),
      ...(body.mayorPersonId !== undefined && {
        mayorPersonId: body.mayorPersonId === null || body.mayorPersonId === '' ? null : Number(body.mayorPersonId),
      }),
      ...(body.coalition !== undefined && { coalition: body.coalition }),
      ...(body.order !== undefined && { order: Number(body.order) }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  })
  return NextResponse.json(list)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { listId } = await params
  await prisma.electionList.delete({ where: { id: Number(listId) } })
  return NextResponse.json({ ok: true })
}
