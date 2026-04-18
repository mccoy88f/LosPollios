import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ candidateId: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { candidateId } = await params
  const body = await req.json()
  const c = await prisma.candidate.update({
    where: { id: Number(candidateId) },
    data: {
      ...(body.firstName !== undefined && { firstName: body.firstName }),
      ...(body.lastName !== undefined && { lastName: body.lastName }),
      ...(body.order !== undefined && { order: Number(body.order) }),
      ...(body.gender !== undefined && { gender: body.gender }),
      ...(body.personId !== undefined && {
        personId: body.personId === null || body.personId === '' ? null : Number(body.personId),
      }),
    },
  })
  return NextResponse.json(c)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { candidateId } = await params
  await prisma.candidate.delete({ where: { id: Number(candidateId) } })
  return NextResponse.json({ ok: true })
}
