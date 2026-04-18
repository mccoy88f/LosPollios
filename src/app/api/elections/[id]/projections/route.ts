import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { calculateProjection, projectFinalVotes } from '@/lib/electoral'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const electionId = Number(id)

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: { lists: { orderBy: { order: 'asc' } } },
  })
  if (!election) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const sections = await prisma.section.findMany({ where: { electionId } })
  const turnouts = await prisma.sectionTurnout.findMany({ where: { electionId } })
  const listResults = await prisma.sectionListResult.findMany({
    where: { section: { electionId } },
  })

  const totalSections   = sections.length
  const sectionsCounted = new Set(turnouts.map(t => t.sectionId)).size

  const listVotesMap = new Map<number, number>()
  for (const r of listResults) {
    listVotesMap.set(r.listId, (listVotesMap.get(r.listId) ?? 0) + r.listVotes)
  }

  const listsInput = election.lists.map(l => ({
    listId:        l.id,
    listName:      l.name,
    shortName:     l.shortName ?? undefined,
    color:         l.color,
    votes:         listVotesMap.get(l.id) ?? 0,
    coalition:     l.coalition ?? undefined,
    candidateMayor: l.candidateMayor ?? undefined,
  }))

  // Proiezione voti finali
  const projectedLists = listsInput.map(l => ({
    ...l,
    projectedVotes: projectFinalVotes(l.votes, sectionsCounted, totalSections),
  }))

  // Calcolo seggi su voti attuali
  const currentProjection = calculateProjection(
    listsInput,
    election.totalSeats,
    election.type,
    election.threshold
  )

  // Calcolo seggi su voti proiettati
  const projectedProjection = calculateProjection(
    projectedLists.map(l => ({ ...l, votes: l.projectedVotes })),
    election.totalSeats,
    election.type,
    election.threshold
  )

  const logos = new Map(
    election.lists.map(l => [
      l.id,
      { listLogoUrl: l.listLogoUrl, coalitionLogoUrl: l.coalitionLogoUrl },
    ])
  )
  const enrich = (proj: ReturnType<typeof calculateProjection>) => ({
    ...proj,
    seats: proj.seats.map(s => ({
      ...s,
      ...logos.get(s.listId),
    })),
  })

  return NextResponse.json({
    totalSections,
    sectionsCounted,
    coverage: totalSections > 0 ? (sectionsCounted / totalSections) * 100 : 0,
    current: enrich(currentProjection),
    projected: enrich(projectedProjection),
    projectedLists: projectedLists.map(l => ({
      ...l,
      ...logos.get(l.listId),
    })),
  })
}
