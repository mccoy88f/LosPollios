import prisma from '@/lib/db'

export type ElectionEntryDataCounts = {
  turnouts: number
  listResults: number
  preferences: number
}

export async function getElectionEntryDataCounts(electionId: number): Promise<ElectionEntryDataCounts> {
  const [turnouts, listResults, preferences] = await Promise.all([
    prisma.sectionTurnout.count({ where: { electionId } }),
    prisma.sectionListResult.count({ where: { section: { electionId } } }),
    prisma.candidatePreference.count({
      where: { sectionResult: { section: { electionId } } },
    }),
  ])
  return { turnouts, listResults, preferences }
}

/** Rimuove affluenze sezione, voti lista e preferenze; mantiene sezioni, liste, tetto comunale, theoreticalVoters. */
export async function clearElectionEntryData(electionId: number): Promise<ElectionEntryDataCounts> {
  const sectionIds = (
    await prisma.section.findMany({
      where: { electionId },
      select: { id: true },
    })
  ).map(s => s.id)

  if (sectionIds.length === 0) {
    return { turnouts: 0, listResults: 0, preferences: 0 }
  }

  return prisma.$transaction(async tx => {
    const preferences = await tx.candidatePreference.deleteMany({
      where: { sectionResult: { sectionId: { in: sectionIds } } },
    })
    const listResults = await tx.sectionListResult.deleteMany({
      where: { sectionId: { in: sectionIds } },
    })
    const turnouts = await tx.sectionTurnout.deleteMany({
      where: { electionId },
    })
    return {
      turnouts: turnouts.count,
      listResults: listResults.count,
      preferences: preferences.count,
    }
  })
}
