import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { normalizeNamePartDisplay } from '@/lib/personUtils'

type Params = { params: Promise<{ resultId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { resultId } = await params
  const listResultId = Number(resultId)
  if (!Number.isFinite(listResultId)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  const parent = await prisma.historicalListResult.findUnique({ where: { id: listResultId } })
  if (!parent) {
    return NextResponse.json({ error: 'Riga lista non trovata' }, { status: 404 })
  }

  const body = await req.json()
  const firstName = normalizeNamePartDisplay(String(body.firstName ?? ''))
  const lastName = normalizeNamePartDisplay(String(body.lastName ?? ''))
  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'Nome e cognome obbligatori' }, { status: 400 })
  }

  const order = body.order !== undefined && body.order !== '' ? Number(body.order) : 0
  const preferenceVotes =
    body.preferenceVotes !== undefined && body.preferenceVotes !== ''
      ? Math.max(0, Number(body.preferenceVotes) || 0)
      : 0
  const personId =
    body.personId === null || body.personId === '' || body.personId === undefined
      ? null
      : Number(body.personId)

  const row = await prisma.historicalCouncilCandidate.create({
    data: {
      listResultId,
      firstName,
      lastName,
      order: Number.isFinite(order) ? order : 0,
      preferenceVotes,
      personId: personId != null && Number.isFinite(personId) ? personId : null,
    },
    include: { person: true },
  })
  return NextResponse.json(row, { status: 201 })
}
