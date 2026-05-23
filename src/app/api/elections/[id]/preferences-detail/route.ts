import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export type MayorHistPoint = {
  year: number
  electionName: string
  listName: string
  percentage: number
  votes: number
}

export type CouncilHistPoint = {
  year: number
  electionName: string
  listName: string
  preferenceVotes: number
  pctOfListVotes: number
}

/** Dati aggregati preferenze + trend storico (sindaco e candidati consiglio collegati in anagrafica) */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const electionId = Number(id)

  const [election, listResults] = await Promise.all([
    prisma.election.findUnique({
      where: { id: electionId },
      include: {
        lists: {
          orderBy: { order: 'asc' },
          include: { candidates: { orderBy: { order: 'asc' } } },
        },
      },
    }),
    prisma.sectionListResult.findMany({
      where: { section: { electionId } },
      include: {
        preferences: { include: { candidate: true } },
      },
    }),
  ])

  if (!election) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const listVotesMap = new Map<number, number>()
  for (const r of listResults) {
    listVotesMap.set(r.listId, (listVotesMap.get(r.listId) ?? 0) + r.listVotes)
  }

  const candidateMap = new Map<
    number,
    { candidateId: number; name: string; votes: number; listId: number; personId: number | null; order: number }
  >()

  for (const list of election.lists) {
    for (const cand of list.candidates) {
      candidateMap.set(cand.id, {
        candidateId: cand.id,
        name: `${cand.firstName} ${cand.lastName}`,
        votes: 0,
        listId: list.id,
        personId: cand.personId ?? null,
        order: cand.order,
      })
    }
  }

  for (const r of listResults) {
    for (const p of r.preferences) {
      const key = p.candidateId
      if (!candidateMap.has(key)) {
        candidateMap.set(key, {
          candidateId: key,
          name: `${p.candidate.firstName} ${p.candidate.lastName}`,
          votes: 0,
          listId: r.listId,
          personId: p.candidate.personId ?? null,
          order: p.candidate.order,
        })
      }
      candidateMap.get(key)!.votes += p.votes
    }
  }

  const lists = election.lists.map(l => {
    const listVotes = listVotesMap.get(l.id) ?? 0
    const candidates = Array.from(candidateMap.values())
      .filter(c => c.listId === l.id)
      .map(c => ({
        ...c,
        pctOfListVotes: listVotes > 0 ? (c.votes / listVotes) * 100 : 0,
      }))
      .sort((a, b) => a.order - b.order || b.votes - a.votes)

    return {
      listId: l.id,
      listName: l.name,
      shortName: l.shortName,
      color: l.color,
      listLogoUrl: l.listLogoUrl,
      coalitionLogoUrl: l.coalitionLogoUrl,
      candidateMayor: l.candidateMayor,
      coalition: l.coalition,
      mayorPersonId: l.mayorPersonId ?? null,
      listVotes,
      candidates,
    }
  })

  const personIdSet = new Set<number>()
  for (const c of candidateMap.values()) {
    if (c.personId != null) personIdSet.add(c.personId)
  }
  for (const l of election.lists) {
    if (l.mayorPersonId != null) personIdSet.add(l.mayorPersonId)
  }
  const personIds = [...personIdSet]

  const mayorHistoryByPersonId: Record<string, MayorHistPoint[]> = {}
  const councilHistoryByPersonId: Record<string, CouncilHistPoint[]> = {}

  if (personIds.length > 0) {
    const [histMayorRows, histCouncilRows] = await Promise.all([
      prisma.historicalListResult.findMany({
        where: { mayorPersonId: { in: personIds } },
        include: { election: true },
        orderBy: { election: { year: 'asc' } },
      }),
      prisma.historicalCouncilCandidate.findMany({
        where: { personId: { in: personIds } },
        include: { listResult: { include: { election: true } } },
        orderBy: { listResult: { election: { year: 'asc' } } },
      }),
    ])

    for (const row of histMayorRows) {
      const pid = String(row.mayorPersonId!)
      if (!mayorHistoryByPersonId[pid]) mayorHistoryByPersonId[pid] = []
      mayorHistoryByPersonId[pid].push({
        year: row.election.year,
        electionName: row.election.name,
        listName: row.listName,
        percentage: row.percentage,
        votes: row.votes,
      })
    }

    for (const row of histCouncilRows) {
      const pid = String(row.personId!)
      const listVotes = row.listResult.votes
      if (!councilHistoryByPersonId[pid]) councilHistoryByPersonId[pid] = []
      councilHistoryByPersonId[pid].push({
        year: row.listResult.election.year,
        electionName: row.listResult.election.name,
        listName: row.listResult.listName,
        preferenceVotes: row.preferenceVotes,
        pctOfListVotes: listVotes > 0 ? (row.preferenceVotes / listVotes) * 100 : 0,
      })
    }
  }

  return NextResponse.json({
    election: {
      id: election.id,
      name: election.name,
      commune: election.commune,
      year: election.date.getFullYear(),
    },
    lists,
    mayorHistoryByPersonId,
    councilHistoryByPersonId,
  })
}
