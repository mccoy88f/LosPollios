import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

/** Dati aggregati preferenze + trend storico (come sindaco su risultati storici, se personId collegata) */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const electionId = Number(id)

  const [election, listResults] = await Promise.all([
    prisma.election.findUnique({
      where: { id: electionId },
      include: { lists: { orderBy: { order: 'asc' } } },
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
      listVotes,
      candidates,
    }
  })

  const personIds = [
    ...new Set(
      Array.from(candidateMap.values())
        .map(c => c.personId)
        .filter((x): x is number => x != null)
    ),
  ]

  const mayorHistoryByPersonId: Record<
    number,
    { year: number; electionName: string; listName: string; percentage: number; votes: number }[]
  > = {}

  if (personIds.length > 0) {
    const histRows = await prisma.historicalListResult.findMany({
      where: { mayorPersonId: { in: personIds } },
      include: { election: true },
      orderBy: { election: { year: 'asc' } },
    })

    for (const row of histRows) {
      const pid = row.mayorPersonId!
      if (!mayorHistoryByPersonId[pid]) mayorHistoryByPersonId[pid] = []
      mayorHistoryByPersonId[pid].push({
        year: row.election.year,
        electionName: row.election.name,
        listName: row.listName,
        percentage: row.percentage,
        votes: row.votes,
      })
    }
  }

  return NextResponse.json({
    election: {
      id: election.id,
      name: election.name,
      commune: election.commune,
    },
    lists,
    mayorHistoryByPersonId,
  })
}
