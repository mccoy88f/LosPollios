import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ resultId: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { resultId } = await params
  const { mayorPersonId } = await req.json()

  const row = await prisma.historicalListResult.update({
    where: { id: Number(resultId) },
    data: {
      mayorPersonId: mayorPersonId === null || mayorPersonId === '' ? null : Number(mayorPersonId),
    },
    include: { mayorPerson: true },
  })
  return NextResponse.json(row)
}
