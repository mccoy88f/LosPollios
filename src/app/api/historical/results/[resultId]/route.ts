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
  const id = Number(resultId)
  const body = await req.json()

  const data: Record<string, string | number | null> = {}

  if ('listName' in body) {
    const v = String(body.listName ?? '').trim()
    if (!v) return NextResponse.json({ error: 'Nome lista obbligatorio' }, { status: 400 })
    data.listName = v
  }
  if ('coalition' in body) {
    data.coalition = body.coalition === null || body.coalition === '' ? null : String(body.coalition)
  }
  if ('candidateMayor' in body) {
    data.candidateMayor =
      body.candidateMayor === null || body.candidateMayor === '' ? null : String(body.candidateMayor)
  }
  if ('votes' in body) {
    data.votes = Math.max(0, Number(body.votes) || 0)
  }
  if ('percentage' in body) {
    data.percentage = Number(body.percentage) || 0
  }
  if ('seats' in body) {
    data.seats =
      body.seats === null || body.seats === '' || body.seats === undefined
        ? null
        : Number(body.seats)
  }
  if ('notes' in body) {
    data.notes = body.notes === null || body.notes === '' ? null : String(body.notes)
  }
  if ('listLogoUrl' in body) {
    data.listLogoUrl =
      body.listLogoUrl === null || body.listLogoUrl === '' ? null : String(body.listLogoUrl)
  }
  if ('coalitionLogoUrl' in body) {
    data.coalitionLogoUrl =
      body.coalitionLogoUrl === null || body.coalitionLogoUrl === ''
        ? null
        : String(body.coalitionLogoUrl)
  }
  if ('mayorPersonId' in body) {
    data.mayorPersonId =
      body.mayorPersonId === null || body.mayorPersonId === '' ? null : Number(body.mayorPersonId)
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  const row = await prisma.historicalListResult.update({
    where: { id },
    data,
    include: {
      mayorPerson: true,
      councilCandidates: { orderBy: [{ order: 'asc' }, { id: 'asc' }], include: { person: true } },
    },
  })
  return NextResponse.json(row)
}
