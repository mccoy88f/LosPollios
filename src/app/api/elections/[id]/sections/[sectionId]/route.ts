import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string; sectionId: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { sectionId } = await params
  const body = await req.json()
  const section = await prisma.section.update({
    where: { id: Number(sectionId) },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.theoreticalVoters !== undefined && { theoreticalVoters: Number(body.theoreticalVoters) }),
    },
  })
  return NextResponse.json(section)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { sectionId } = await params
  await prisma.section.delete({ where: { id: Number(sectionId) } })
  return NextResponse.json({ ok: true })
}
