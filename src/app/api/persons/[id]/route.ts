import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

/** Cronologia collegamenti: sindaco e candidato consigliere, anche storico */
export async function GET(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id } = await params
  const personId = Number(id)
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: {
      mayorForLists: {
        include: { election: true },
        orderBy: { election: { date: 'desc' } },
      },
      candidates: {
        include: { list: { include: { election: true } } },
        orderBy: { list: { election: { date: 'desc' } } },
      },
      historicalMayors: {
        include: { election: true },
        orderBy: { election: { year: 'desc' } },
      },
    },
  })
  if (!person) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

  const timeline: {
    kind: 'mayor_current' | 'candidate' | 'mayor_historical'
    label: string
    detail: string
    year?: number
    date?: string
  }[] = []

  for (const l of person.mayorForLists) {
    timeline.push({
      kind: 'mayor_current',
      label: `Sindaco di lista (elezione in corso/archivio operativo)`,
      detail: `${l.name} · ${l.election.name} (${l.election.commune})`,
      date: l.election.date.toISOString(),
    })
  }
  for (const c of person.candidates) {
    timeline.push({
      kind: 'candidate',
      label: 'Candidato al consiglio',
      detail: `${c.list.name} · ${c.list.election.name} (${c.list.election.commune})`,
      date: c.list.election.date.toISOString(),
    })
  }
  for (const h of person.historicalMayors) {
    timeline.push({
      kind: 'mayor_historical',
      label: 'Sindaco di lista (elezione storica)',
      detail: `${h.listName} · ${h.election.name} (${h.election.commune})`,
      year: h.election.year,
    })
  }

  timeline.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : (a.year ?? 0) * 1e10
    const tb = b.date ? new Date(b.date).getTime() : (b.year ?? 0) * 1e10
    return tb - ta
  })

  return NextResponse.json({ person, timeline })
}
