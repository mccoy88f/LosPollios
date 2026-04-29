import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { normalizeNamePartDisplay } from '@/lib/personUtils'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  const body = await req.json()
  const data: {
    firstName?: string
    lastName?: string
    order?: number
    preferenceVotes?: number
    personId?: number | null
  } = {}

  if ('firstName' in body) {
    const v = normalizeNamePartDisplay(String(body.firstName ?? ''))
    if (!v) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })
    data.firstName = v
  }
  if ('lastName' in body) {
    const v = normalizeNamePartDisplay(String(body.lastName ?? ''))
    if (!v) return NextResponse.json({ error: 'Cognome obbligatorio' }, { status: 400 })
    data.lastName = v
  }
  if ('order' in body) {
    data.order = Number(body.order) || 0
  }
  if ('preferenceVotes' in body) {
    data.preferenceVotes = Math.max(0, Number(body.preferenceVotes) || 0)
  }
  if ('personId' in body) {
    data.personId =
      body.personId === null || body.personId === '' ? null : Number(body.personId)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  try {
    const row = await prisma.historicalCouncilCandidate.update({
      where: { id },
      data,
      include: { person: true },
    })
    return NextResponse.json(row)
  } catch {
    return NextResponse.json({ error: 'Candidato non trovato' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id: idStr } = await params
  const id = Number(idStr)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  try {
    await prisma.historicalCouncilCandidate.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Candidato non trovato' }, { status: 404 })
  }
}
