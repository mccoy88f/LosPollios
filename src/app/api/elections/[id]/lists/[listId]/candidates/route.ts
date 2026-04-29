import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { normalizeNamePartDisplay } from '@/lib/personUtils'

type Params = { params: Promise<{ listId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { listId } = await params
  const candidates = await prisma.candidate.findMany({
    where: { listId: Number(listId) },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(candidates)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { listId } = await params
  const body = await req.json()

  if (Array.isArray(body.candidates)) {
    const created = await prisma.$transaction(
      body.candidates.map((c: { firstName: string; lastName: string; order?: number; gender?: string }) =>
        prisma.candidate.create({
          data: {
            listId: Number(listId),
            firstName: normalizeNamePartDisplay(c.firstName),
            lastName: normalizeNamePartDisplay(c.lastName),
            order: Number(c.order ?? 0),
            gender: c.gender,
          },
        })
      )
    )
    return NextResponse.json(created, { status: 201 })
  }

  const { firstName, lastName, order, gender } = body
  const candidate = await prisma.candidate.create({
    data: {
      listId: Number(listId),
      firstName: normalizeNamePartDisplay(firstName),
      lastName: normalizeNamePartDisplay(lastName),
      order: Number(order ?? 0),
      gender,
    },
  })
  return NextResponse.json(candidate, { status: 201 })
}
