import prisma from '@/lib/db'
import type { EligendoParseResult } from '@/lib/eligendoImport'
import type { HistoricalParsedRow, HistoricalCandidateRow } from '@/lib/historicalExcel'
import { normalizeFullNameLabel, normalizeNamePartDisplay } from '@/lib/personUtils'

/** Sezione dedicata ai totali comunali (import Eligendo/Excel storico). Non sommare con altre sezioni che hanno già voti. */
export const SYNTHESIS_SECTION_NUMBER = 0

const PALETTE = ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#14b8a6', '#a855f7', '#eab308', '#ef4444']

function colorForIndex(i: number): string {
  return PALETTE[i % PALETTE.length]
}

export async function requireArchivedElection(electionId: number) {
  const e = await prisma.election.findUnique({ where: { id: electionId } })
  if (!e) throw new Error('Elezione non trovata')
  if (!e.archived) {
    throw new Error('L’import macro storico è consentito solo su elezioni archiviate.')
  }
  return e
}

async function assertNoConflictingSectionResults(electionId: number) {
  const bad = await prisma.section.findFirst({
    where: {
      electionId,
      number: { not: SYNTHESIS_SECTION_NUMBER },
      listResults: { some: { listVotes: { gt: 0 } } },
    },
  })
  if (bad) {
    throw new Error(
      'Questa elezione ha già voti di lista su sezioni diverse dalla sintesi comunale (n. 0). ' +
        'Per usare l’import Eligendo/Excel macro serve un’elezione archiviata senza spoglio per sezioni reali, ' +
        'oppure elimina prima i risultati sulle altre sezioni.'
    )
  }
}

export async function ensureSynthesisSection(electionId: number) {
  return prisma.section.upsert({
    where: { electionId_number: { electionId, number: SYNTHESIS_SECTION_NUMBER } },
    update: {
      name: 'Sintesi comunale (import storico)',
    },
    create: {
      electionId,
      number: SYNTHESIS_SECTION_NUMBER,
      name: 'Sintesi comunale (import storico)',
      location: null,
      theoreticalVoters: 0,
      order: SYNTHESIS_SECTION_NUMBER,
    },
  })
}

async function findOrCreateList(
  electionId: number,
  name: string,
  data: {
    coalition?: string | null
    candidateMayor?: string | null
    listLogoUrl?: string | null
    coalitionLogoUrl?: string | null
    importedSeats?: number | null
  }
) {
  const lists = await prisma.electionList.findMany({ where: { electionId } })
  const norm = name.trim().toLowerCase()
  const found = lists.find(l => l.name.trim().toLowerCase() === norm)
  if (found) {
    return prisma.electionList.update({
      where: { id: found.id },
      data: {
        ...(data.coalition !== undefined && { coalition: data.coalition }),
        ...(data.candidateMayor !== undefined && { candidateMayor: data.candidateMayor }),
        ...(data.listLogoUrl !== undefined && { listLogoUrl: data.listLogoUrl }),
        ...(data.coalitionLogoUrl !== undefined && { coalitionLogoUrl: data.coalitionLogoUrl }),
        ...(data.importedSeats !== undefined && { importedSeats: data.importedSeats }),
      },
    })
  }
  const maxOrder = lists.reduce((m, l) => Math.max(m, l.order), -1)
  return prisma.electionList.create({
    data: {
      electionId,
      name: name.trim(),
      order: maxOrder + 1,
      color: colorForIndex(maxOrder + 1),
      coalition: data.coalition ?? null,
      candidateMayor: data.candidateMayor ?? null,
      listLogoUrl: data.listLogoUrl ?? null,
      coalitionLogoUrl: data.coalitionLogoUrl ?? null,
      importedSeats: data.importedSeats ?? null,
    },
  })
}

function appendImportNote(existing: string | null, block: string): string {
  const cur = existing?.trim() || ''
  if (!cur) return block
  if (cur.includes(block.trim())) return cur
  return `${cur}\n\n${block}`
}

export async function applyEligendoMacroToElection(
  electionId: number,
  parsed: EligendoParseResult,
  urlNote: string
) {
  const electionRow = await requireArchivedElection(electionId)
  await assertNoConflictingSectionResults(electionId)
  const section = await ensureSynthesisSection(electionId)
  const a = parsed.affluenza

  await prisma.election.update({
    where: { id: electionId },
    data: {
      ...(a.registeredVoters != null && { registeredVoters: a.registeredVoters }),
      ...(a.turnoutVoters != null && { turnoutVoters: a.turnoutVoters }),
      ...(a.turnoutPercent != null && { turnoutPercent: a.turnoutPercent }),
      ...(a.ballotsBlank != null && { ballotsBlank: a.ballotsBlank }),
      ...(a.ballotsInvalidInclBlank != null && { ballotsInvalidInclBlank: a.ballotsInvalidInclBlank }),
      notes: appendImportNote(electionRow.notes, [urlNote, parsed.titleRaw].filter(Boolean).join('\n')),
    },
  })

  for (const row of parsed.results) {
    const list = await findOrCreateList(electionId, row.listName, {
      coalition: row.coalition,
      candidateMayor: normalizeFullNameLabel(row.candidateMayor),
      listLogoUrl: row.listLogoUrl,
      importedSeats: row.seats,
    })
    await prisma.sectionListResult.upsert({
      where: { sectionId_listId: { sectionId: section.id, listId: list.id } },
      update: { listVotes: row.votes, enteredBy: 'import-eligendo' },
      create: {
        sectionId: section.id,
        listId: list.id,
        listVotes: row.votes,
        enteredBy: 'import-eligendo',
      },
    })
  }

  return prisma.election.findUnique({
    where: { id: electionId },
    include: { lists: { include: { candidates: true } }, sections: true },
  })
}

export async function applyExcelMacroToElection(electionId: number, rows: HistoricalParsedRow[]) {
  await requireArchivedElection(electionId)
  await assertNoConflictingSectionResults(electionId)
  const section = await ensureSynthesisSection(electionId)

  for (const row of rows) {
    const list = await findOrCreateList(electionId, row.listName, {
      coalition: row.coalition,
      candidateMayor: normalizeFullNameLabel(row.candidateMayor),
      importedSeats: row.seats,
    })
    const votes = row.votes
    if (votes == null) continue
    await prisma.sectionListResult.upsert({
      where: { sectionId_listId: { sectionId: section.id, listId: list.id } },
      update: { listVotes: votes, enteredBy: 'import-excel-storico' },
      create: {
        sectionId: section.id,
        listId: list.id,
        listVotes: votes,
        enteredBy: 'import-excel-storico',
      },
    })
  }

  return prisma.election.findUnique({
    where: { id: electionId },
    include: { lists: { include: { candidates: true } }, sections: true },
  })
}

export async function applyCandidateRowsToElection(electionId: number, rows: HistoricalCandidateRow[]) {
  if (!rows.length) return prisma.election.findUnique({ where: { id: electionId } })
  await requireArchivedElection(electionId)
  const section = await prisma.section.findUnique({
    where: { electionId_number: { electionId, number: SYNTHESIS_SECTION_NUMBER } },
  })
  if (!section) {
    throw new Error('Crea prima le liste con import Eligendo o foglio «Risultati» (macro).')
  }

  for (const row of rows) {
    if (!row.listName?.trim() || !row.lastName?.trim()) continue
    const list = await findOrCreateList(electionId, row.listName, {})
    let cand = await prisma.candidate.findFirst({
      where: { listId: list.id, order: row.order },
    })
    const fn = normalizeNamePartDisplay(row.firstName.trim()) || '—'
    const ln = normalizeNamePartDisplay(row.lastName.trim())
    if (cand) {
      cand = await prisma.candidate.update({
        where: { id: cand.id },
        data: { firstName: fn, lastName: ln },
      })
    } else {
      cand = await prisma.candidate.create({
        data: { listId: list.id, firstName: fn, lastName: ln, order: row.order },
      })
    }

    if (row.preferenceVotes == null || row.preferenceVotes < 0) continue
    const sr = await prisma.sectionListResult.findUnique({
      where: { sectionId_listId: { sectionId: section.id, listId: list.id } },
    })
    if (!sr) continue

    await prisma.candidatePreference.upsert({
      where: { sectionResultId_candidateId: { sectionResultId: sr.id, candidateId: cand.id } },
      update: { votes: row.preferenceVotes, enteredBy: 'import-excel-storico' },
      create: {
        sectionResultId: sr.id,
        candidateId: cand.id,
        votes: row.preferenceVotes,
        enteredBy: 'import-excel-storico',
      },
    })
  }

  return prisma.election.findUnique({
    where: { id: electionId },
    include: { lists: { include: { candidates: true } }, sections: true },
  })
}

/** Controlla se l’elezione può ricevere import macro senza conflitto */
export async function canImportMacroToElection(electionId: number): Promise<{ ok: boolean; reason?: string }> {
  const e = await prisma.election.findUnique({ where: { id: electionId } })
  if (!e) return { ok: false, reason: 'Elezione non trovata' }
  if (!e.archived) return { ok: false, reason: 'Non archiviata' }
  try {
    await assertNoConflictingSectionResults(electionId)
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Conflitto sezioni' }
  }
}
