import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getElectionLastDataUpdateAt } from '@/lib/electionUpdates'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const electionId = Number(id)

  const [election, sections, turnouts, listResults, lastDataUpdateAt] = await Promise.all([
    prisma.election.findUnique({
      where: { id: electionId },
      include: { lists: { orderBy: { order: 'asc' } } },
    }),
    prisma.section.findMany({ where: { electionId }, orderBy: { number: 'asc' } }),
    prisma.sectionTurnout.findMany({ where: { electionId } }),
    prisma.sectionListResult.findMany({
      where: { section: { electionId } },
      include: {
        list: true,
        preferences: { include: { candidate: true } },
      },
    }),
    getElectionLastDataUpdateAt(electionId),
  ])

  if (!election) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const totalSections = sections.length
  const sectionsCounted = new Set(turnouts.map(t => t.sectionId)).size

  // Aggregated turnout
  const totalTheoretical = sections.reduce((s, sec) => s + sec.theoreticalVoters, 0)
  const totalActual      = turnouts.reduce((s, t) => s + t.votersActual, 0)
  const totalValid       = turnouts.reduce((s, t) => s + (t.ballotsValid ?? 0), 0)
  const totalNull        = turnouts.reduce((s, t) => s + (t.ballotsNull ?? 0), 0)
  const totalBlank       = turnouts.reduce((s, t) => s + (t.ballotsBlank ?? 0), 0)

  // Aggregated list votes
  const listVotesMap = new Map<number, number>()
  for (const r of listResults) {
    listVotesMap.set(r.listId, (listVotesMap.get(r.listId) ?? 0) + r.listVotes)
  }

  // Candidate preferences aggregated
  const candidateMap = new Map<number, { candidateId: number; name: string; votes: number; listId: number; personId: number | null; order: number }>()
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

  // Section status
  const turnoutBySection = new Map(turnouts.map(t => [t.sectionId, t]))
  const resultsBySection = listResults.reduce((m, r) => {
    if (!m.has(r.sectionId)) m.set(r.sectionId, [])
    m.get(r.sectionId)!.push(r)
    return m
  }, new Map<number, typeof listResults>())

  const sectionStatus = sections.map(sec => {
    const sectionResults = resultsBySection.get(sec.id) ?? []
    const hasPositiveListVotes = sectionResults.some(r => r.listVotes > 0)
    const hasPositivePreferences = sectionResults.some(r => r.preferences.some(p => p.votes > 0))
    const listVotesSum = sectionResults.reduce((s, r) => s + r.listVotes, 0)
    const turnoutRow = turnoutBySection.get(sec.id)
    const ballotsValid = turnoutRow?.ballotsValid ?? null
    const votersActual = turnoutRow?.votersActual ?? null

    const sectionWarnings: string[] = []
    if (listVotesSum > 0 && turnoutRow) {
      if (ballotsValid != null && listVotesSum !== ballotsValid) {
        sectionWarnings.push(
          `Somma voti lista (${listVotesSum}) diversa da schede valide (${ballotsValid}).`
        )
      } else if (ballotsValid == null && votersActual != null && votersActual > 0 && listVotesSum !== votersActual) {
        sectionWarnings.push(
          `Somma voti lista (${listVotesSum}) diversa da votanti reali (${votersActual}); conviene compilare le schede valide.`
        )
      }
    }
    for (const r of sectionResults) {
      const prefSum = r.preferences.reduce((s, p) => s + p.votes, 0)
      if (r.listVotes > 0 && prefSum > r.listVotes) {
        sectionWarnings.push(
          `${r.list.name}: preferenze (${prefSum}) superiori ai voti lista (${r.listVotes}).`
        )
      }
    }

    return {
      id: sec.id,
      number: sec.number,
      name: sec.name,
      locked: sec.locked,
      theoreticalVoters: sec.theoreticalVoters,
      hasTurnout: turnoutBySection.has(sec.id),
      // "Ha risultati" solo se c'e' almeno un dato voto reale (non semplice presenza righe a zero).
      hasResults: hasPositiveListVotes || hasPositivePreferences,
      votersActual,
      listVotesSum,
      ballotsValid,
      sectionWarnings,
      turnoutPct: sec.theoreticalVoters > 0 && turnoutBySection.has(sec.id)
        ? (turnoutBySection.get(sec.id)!.votersActual / sec.theoreticalVoters) * 100
        : null,
    }
  })

  const listsAggregated = election.lists.map(l => ({
    listId:        l.id,
    listName:      l.name,
    shortName:     l.shortName,
    color:         l.color,
    listLogoUrl:   l.listLogoUrl,
    coalitionLogoUrl: l.coalitionLogoUrl,
    candidateMayor: l.candidateMayor,
    coalition:     l.coalition,
    votes:         listVotesMap.get(l.id) ?? 0,
    candidates:    Array.from(candidateMap.values())
      .filter(c => c.listId === l.id)
      .sort((a, b) => a.order - b.order || b.votes - a.votes),
  }))
  const totalListVotes = listsAggregated.reduce((s, l) => s + l.votes, 0)
  // Progress scrutinio basato sui voti scrutinati rispetto ai votanti reali registrati.
  const scrutinizedVotesPercentage =
    totalActual > 0 ? Math.min(100, (totalListVotes / totalActual) * 100) : 0

  const dataQuality = {
    sectionsWithDataWarnings: sectionStatus.filter(s => s.sectionWarnings.length > 0).length,
    listVotesExceedRegisteredVoters: totalActual > 0 && totalListVotes > totalActual,
  }

  return NextResponse.json({
    election: { id: election.id, name: election.name, commune: election.commune, date: election.date,
                type: election.type, totalSeats: election.totalSeats, threshold: election.threshold,
                status: election.status },
    progress: {
      totalSections,
      sectionsCounted,
      percentage: scrutinizedVotesPercentage,
      scrutinizedVotes: totalListVotes,
      expectedVotes: totalActual,
    },
    turnout:  { totalTheoretical, totalActual, totalValid, totalNull, totalBlank,
                percentage: totalTheoretical > 0 ? (totalActual / totalTheoretical) * 100 : 0 },
    lists: listsAggregated,
    sectionStatus,
    dataQuality,
    /** Istante di generazione della risposta (refresh client) */
    lastUpdate: new Date().toISOString(),
    /** Ultimo salvataggio su DB tra affluenza, voti lista e preferenze (sezioni) */
    lastDataUpdateAt,
  })
}
