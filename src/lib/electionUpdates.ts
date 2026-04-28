import prisma from '@/lib/db'

export type ElectionUpdateKind = 'affluenza' | 'voti_lista' | 'preferenze'

export type ElectionUpdateEvent = {
  at: string
  kind: ElectionUpdateKind
  sectionNumber: number
  sectionName: string | null
  listName: string | null
  candidateName: string | null
  by: string | null
  detail: string | null
}

function maxIso(...dates: (Date | null | undefined)[]): string | null {
  const ms = dates.filter((d): d is Date => d != null).map(d => d.getTime())
  if (!ms.length) return null
  return new Date(Math.max(...ms)).toISOString()
}

/** Ultimo aggiornamento “reale” sui dati di spoglio (max updatedAt tra turnout, risultati lista, preferenze). */
export async function getElectionLastDataUpdateAt(electionId: number): Promise<string | null> {
  const [tMax, lMax, pMax] = await Promise.all([
    prisma.sectionTurnout.aggregate({ where: { electionId }, _max: { updatedAt: true } }),
    prisma.sectionListResult.aggregate({
      where: { section: { electionId } },
      _max: { updatedAt: true },
    }),
    prisma.candidatePreference.aggregate({
      where: { sectionResult: { section: { electionId } } },
      _max: { updatedAt: true },
    }),
  ])
  return maxIso(tMax._max.updatedAt, lMax._max.updatedAt, pMax._max.updatedAt)
}

const FETCH_EACH = 400
const MAX_MERGED = 250

export async function getElectionUpdateFeed(electionId: number): Promise<ElectionUpdateEvent[]> {
  const [turnouts, listResults, prefs] = await Promise.all([
    prisma.sectionTurnout.findMany({
      where: { electionId },
      take: FETCH_EACH,
      orderBy: { updatedAt: 'desc' },
      include: { section: { select: { number: true, name: true } } },
    }),
    prisma.sectionListResult.findMany({
      where: { section: { electionId } },
      take: FETCH_EACH,
      orderBy: { updatedAt: 'desc' },
      include: {
        section: { select: { number: true, name: true } },
        list: { select: { name: true } },
      },
    }),
    prisma.candidatePreference.findMany({
      where: { sectionResult: { section: { electionId } } },
      take: FETCH_EACH,
      orderBy: { updatedAt: 'desc' },
      include: {
        candidate: { select: { firstName: true, lastName: true } },
        sectionResult: {
          include: {
            section: { select: { number: true, name: true } },
            list: { select: { name: true } },
          },
        },
      },
    }),
  ])

  const events: ElectionUpdateEvent[] = []

  for (const t of turnouts) {
    const detailParts = [`${t.votersActual.toLocaleString('it-IT')} votanti`]
    if (t.ballotsValid != null) detailParts.push(`${t.ballotsValid.toLocaleString('it-IT')} schede valide`)
    events.push({
      at: t.updatedAt.toISOString(),
      kind: 'affluenza',
      sectionNumber: t.section.number,
      sectionName: t.section.name,
      listName: null,
      candidateName: null,
      by: t.enteredBy ?? null,
      detail: detailParts.join(' · '),
    })
  }

  for (const r of listResults) {
    events.push({
      at: r.updatedAt.toISOString(),
      kind: 'voti_lista',
      sectionNumber: r.section.number,
      sectionName: r.section.name,
      listName: r.list.name,
      candidateName: null,
      by: r.enteredBy ?? null,
      detail: `${r.listVotes.toLocaleString('it-IT')} voti di lista`,
    })
  }

  for (const p of prefs) {
    const sec = p.sectionResult.section
    const list = p.sectionResult.list
    const cand = p.candidate
    events.push({
      at: p.updatedAt.toISOString(),
      kind: 'preferenze',
      sectionNumber: sec.number,
      sectionName: sec.name,
      listName: list.name,
      candidateName: `${cand.firstName} ${cand.lastName}`,
      by: p.enteredBy ?? null,
      detail: `${p.votes.toLocaleString('it-IT')} voti preferenza`,
    })
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return events.slice(0, MAX_MERGED)
}
