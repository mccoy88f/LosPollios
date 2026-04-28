import prisma from '@/lib/db'
import type { HistoricalCandidateRow, HistoricalParsedRow } from '@/lib/historicalExcel'

function normListName(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Applica foglio «Risultati» e/o «Candidati» a un record HistoricalElection esistente.
 * - Liste: aggiorna solo i campi con valore non null nel file (voti/% opzionali).
 * - Candidati: upsert per (lista, cognome, nome), mantiene personId se stesso nominativo; rimuove chi non è più nel file.
 */
export async function mergeHistoricalElectionFromExcel(
  electionId: number,
  lists: HistoricalParsedRow[],
  candidates: HistoricalCandidateRow[]
) {
  const election = await prisma.historicalElection.findUnique({ where: { id: electionId } })
  if (!election) throw new Error('Elezione storica non trovata')

  if (lists.length > 0) {
    const dbRows = await prisma.historicalListResult.findMany({ where: { electionId } })
    const byNorm = new Map(dbRows.map(r => [normListName(r.listName), r]))

    for (const row of lists) {
      const key = normListName(row.listName)
      const existing = byNorm.get(key)
      if (!existing) continue

      const data: {
        coalition?: string | null
        candidateMayor?: string | null
        votes?: number
        percentage?: number
        seats?: number | null
      } = {}

      if (row.coalition !== undefined) data.coalition = row.coalition
      if (row.candidateMayor !== undefined) data.candidateMayor = row.candidateMayor
      if (row.votes != null) data.votes = row.votes
      if (row.percentage != null) data.percentage = row.percentage
      if (row.seats !== undefined) data.seats = row.seats

      if (Object.keys(data).length > 0) {
        await prisma.historicalListResult.update({ where: { id: existing.id }, data })
      }
    }
  }

  if (candidates.length > 0) {
    const dbRows = await prisma.historicalListResult.findMany({ where: { electionId } })
    const byNorm = new Map(dbRows.map(r => [normListName(r.listName), r]))

    const grouped = new Map<string, HistoricalCandidateRow[]>()
    for (const c of candidates) {
      if (!c.listName?.trim() || !c.lastName?.trim()) continue
      const k = normListName(c.listName)
      if (!grouped.has(k)) grouped.set(k, [])
      grouped.get(k)!.push(c)
    }

    for (const [normKey, rows] of grouped) {
      const list = byNorm.get(normKey)
      if (!list) continue

      const keptIds: number[] = []

      await prisma.$transaction(async tx => {
        for (const row of rows) {
          const fn = (row.firstName || '—').trim() || '—'
          const ln = row.lastName.trim()
          const pv =
            row.preferenceVotes != null && row.preferenceVotes >= 0 ? row.preferenceVotes : 0

          const existing = await tx.historicalCouncilCandidate.findFirst({
            where: { listResultId: list.id, lastName: ln, firstName: fn },
          })

          if (existing) {
            await tx.historicalCouncilCandidate.update({
              where: { id: existing.id },
              data: { order: row.order, preferenceVotes: pv },
            })
            keptIds.push(existing.id)
          } else {
            const created = await tx.historicalCouncilCandidate.create({
              data: {
                listResultId: list.id,
                firstName: fn,
                lastName: ln,
                order: row.order,
                preferenceVotes: pv,
              },
            })
            keptIds.push(created.id)
          }
        }

        if (keptIds.length === 0) {
          await tx.historicalCouncilCandidate.deleteMany({ where: { listResultId: list.id } })
        } else {
          await tx.historicalCouncilCandidate.deleteMany({
            where: { listResultId: list.id, id: { notIn: keptIds } },
          })
        }
      })
    }
  }

  return prisma.historicalElection.findUnique({
    where: { id: electionId },
    include: {
      results: {
        orderBy: { votes: 'desc' },
        include: {
          mayorPerson: true,
          councilCandidates: { orderBy: [{ order: 'asc' }, { id: 'asc' }], include: { person: true } },
        },
      },
    },
  })
}
