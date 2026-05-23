import { createHash } from 'crypto'
import { gunzipSync, gzipSync } from 'zlib'
import prisma from '@/lib/db'
import { normalizeNamePartDisplay } from '@/lib/personUtils'
import type { Prisma } from '@prisma/client'

export const ELECTION_BACKUP_VERSION = 1 as const

export type ElectionBackupPayload = {
  backupVersion: typeof ELECTION_BACKUP_VERSION
  exportedAt: string
  app: 'lospollios'
  sourceElectionId: number
  checksum?: string
  election: {
    name: string
    commune: string
    date: string
    type: string
    totalSeats: number
    threshold: number
    status: string
    archived: boolean
    notes: string | null
    eligibleVotersTotal: number | null
    registeredVoters: number | null
    turnoutVoters: number | null
    turnoutPercent: number | null
    ballotsBlank: number | null
    ballotsInvalidInclBlank: number | null
  }
  sections: Array<{
    number: number
    name: string | null
    location: string | null
    theoreticalVoters: number
    order: number
    locked: boolean
  }>
  lists: Array<{
    name: string
    shortName: string | null
    color: string
    listLogoUrl: string | null
    coalitionLogoUrl: string | null
    candidateMayor: string | null
    coalition: string | null
    order: number
    notes: string | null
    importedSeats: number | null
    candidates: Array<{
      firstName: string
      lastName: string
      order: number
      gender: string | null
    }>
  }>
  turnouts: Array<{
    sectionNumber: number
    votersActual: number
    ballotsValid: number | null
    ballotsNull: number | null
    ballotsBlank: number | null
    enteredBy: string | null
    enteredAt: string
    updatedAt: string
  }>
  listResults: Array<{
    sectionNumber: number
    listName: string
    listVotes: number
    enteredBy: string | null
    enteredAt: string
    updatedAt: string
    preferences: Array<{
      candidateFirstName: string
      candidateLastName: string
      votes: number
      enteredBy: string | null
      updatedAt: string
    }>
  }>
}

export type ElectionBackupCounts = {
  sections: number
  lists: number
  candidates: number
  turnouts: number
  listResults: number
  preferences: number
}

export type ElectionBackupSummary = {
  valid: boolean
  errors: string[]
  backupVersion: number | null
  exportedAt: string | null
  electionName: string | null
  commune: string | null
  sourceElectionId: number | null
  counts: ElectionBackupCounts
}

function normKey(s: string): string {
  return s.trim().toLowerCase()
}

function listKey(name: string): string {
  return normKey(name)
}

function candidateKey(firstName: string, lastName: string): string {
  return `${normKey(firstName)}|${normKey(lastName)}`
}

function attachChecksum(payload: Omit<ElectionBackupPayload, 'checksum'>): ElectionBackupPayload {
  const body = JSON.stringify(payload)
  const checksum = createHash('sha256').update(body).digest('hex')
  return { ...payload, checksum }
}

export function isGzipBuffer(buf: Buffer): boolean {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b
}

export function decodeBackupBuffer(buf: Buffer): ElectionBackupPayload {
  const raw = isGzipBuffer(buf) ? gunzipSync(buf) : buf
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.toString('utf8'))
  } catch {
    throw new Error('File non valido: JSON illeggibile')
  }
  const errors = validateElectionBackup(parsed)
  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
  const payload = parsed as ElectionBackupPayload
  if (payload.checksum) {
    const { checksum: _c, ...rest } = payload
    const expected = createHash('sha256').update(JSON.stringify(rest)).digest('hex')
    if (expected !== payload.checksum) {
      throw new Error('Checksum backup non valido: il file potrebbe essere corrotto')
    }
  }
  return payload
}

export function encodeBackupGzip(payload: ElectionBackupPayload): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'))
}

export function validateElectionBackup(data: unknown): string[] {
  const errors: string[] = []
  if (!data || typeof data !== 'object') {
    return ['Formato backup non riconosciuto']
  }
  const o = data as Record<string, unknown>
  if (o.backupVersion !== ELECTION_BACKUP_VERSION) {
    errors.push(`Versione backup non supportata (attesa ${ELECTION_BACKUP_VERSION})`)
  }
  if (o.app !== 'lospollios') {
    errors.push('File non generato da LosPollios')
  }
  if (!o.election || typeof o.election !== 'object') {
    errors.push('Manca il blocco election')
  }
  if (!Array.isArray(o.sections)) errors.push('Manca sections')
  if (!Array.isArray(o.lists)) errors.push('Manca lists')
  if (!Array.isArray(o.turnouts)) errors.push('Manca turnouts')
  if (!Array.isArray(o.listResults)) errors.push('Manca listResults')
  return errors
}

export function summarizeBackupPayload(payload: ElectionBackupPayload): ElectionBackupSummary {
  const pref = payload.listResults.reduce((s, r) => s + r.preferences.length, 0)
  const candidates = payload.lists.reduce((s, l) => s + l.candidates.length, 0)
  return {
    valid: true,
    errors: [],
    backupVersion: payload.backupVersion,
    exportedAt: payload.exportedAt,
    electionName: payload.election.name,
    commune: payload.election.commune,
    sourceElectionId: payload.sourceElectionId,
    counts: {
      sections: payload.sections.length,
      lists: payload.lists.length,
      candidates,
      turnouts: payload.turnouts.length,
      listResults: payload.listResults.length,
      preferences: pref,
    },
  }
}

export async function getElectionDataCounts(electionId: number): Promise<ElectionBackupCounts> {
  const [sections, lists, candidates, turnouts, listResults, preferences] = await Promise.all([
    prisma.section.count({ where: { electionId } }),
    prisma.electionList.count({ where: { electionId } }),
    prisma.candidate.count({ where: { list: { electionId } } }),
    prisma.sectionTurnout.count({ where: { electionId } }),
    prisma.sectionListResult.count({ where: { section: { electionId } } }),
    prisma.candidatePreference.count({
      where: { sectionResult: { section: { electionId } } },
    }),
  ])
  return { sections, lists, candidates, turnouts, listResults, preferences }
}

export async function exportElectionBackup(electionId: number): Promise<ElectionBackupPayload> {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: {
      sections: { orderBy: [{ order: 'asc' }, { number: 'asc' }] },
      lists: {
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: { candidates: { orderBy: { order: 'asc' } } },
      },
      turnouts: true,
    },
  })
  if (!election) throw new Error('Elezione non trovata')

  const listResults = await prisma.sectionListResult.findMany({
    where: { section: { electionId } },
    include: {
      section: { select: { number: true } },
      list: { select: { name: true } },
      preferences: { include: { candidate: true } },
    },
  })

  const sectionById = new Map(election.sections.map(s => [s.id, s.number]))

  const payloadWithoutChecksum: Omit<ElectionBackupPayload, 'checksum'> = {
    backupVersion: ELECTION_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'lospollios',
    sourceElectionId: election.id,
    election: {
      name: election.name,
      commune: election.commune,
      date: election.date.toISOString(),
      type: election.type,
      totalSeats: election.totalSeats,
      threshold: election.threshold,
      status: election.status,
      archived: election.archived,
      notes: election.notes,
      eligibleVotersTotal: election.eligibleVotersTotal,
      registeredVoters: election.registeredVoters,
      turnoutVoters: election.turnoutVoters,
      turnoutPercent: election.turnoutPercent,
      ballotsBlank: election.ballotsBlank,
      ballotsInvalidInclBlank: election.ballotsInvalidInclBlank,
    },
    sections: election.sections.map(s => ({
      number: s.number,
      name: s.name,
      location: s.location,
      theoreticalVoters: s.theoreticalVoters,
      order: s.order,
      locked: s.locked,
    })),
    lists: election.lists.map(l => ({
      name: l.name,
      shortName: l.shortName,
      color: l.color,
      listLogoUrl: l.listLogoUrl,
      coalitionLogoUrl: l.coalitionLogoUrl,
      candidateMayor: l.candidateMayor,
      coalition: l.coalition,
      order: l.order,
      notes: l.notes,
      importedSeats: l.importedSeats,
      candidates: l.candidates.map(c => ({
        firstName: c.firstName,
        lastName: c.lastName,
        order: c.order,
        gender: c.gender,
      })),
    })),
    turnouts: election.turnouts.map(t => ({
      sectionNumber: sectionById.get(t.sectionId) ?? 0,
      votersActual: t.votersActual,
      ballotsValid: t.ballotsValid,
      ballotsNull: t.ballotsNull,
      ballotsBlank: t.ballotsBlank,
      enteredBy: t.enteredBy,
      enteredAt: t.enteredAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    listResults: listResults.map(r => ({
      sectionNumber: r.section.number,
      listName: r.list.name,
      listVotes: r.listVotes,
      enteredBy: r.enteredBy,
      enteredAt: r.enteredAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      preferences: r.preferences.map(p => ({
        candidateFirstName: p.candidate.firstName,
        candidateLastName: p.candidate.lastName,
        votes: p.votes,
        enteredBy: p.enteredBy,
        updatedAt: p.updatedAt.toISOString(),
      })),
    })),
  }

  return attachChecksum(payloadWithoutChecksum)
}

async function wipeElectionContent(tx: Prisma.TransactionClient, electionId: number) {
  const sectionIds = (
    await tx.section.findMany({ where: { electionId }, select: { id: true } })
  ).map(s => s.id)

  if (sectionIds.length > 0) {
    await tx.candidatePreference.deleteMany({
      where: { sectionResult: { sectionId: { in: sectionIds } } },
    })
    await tx.sectionListResult.deleteMany({ where: { sectionId: { in: sectionIds } } })
    await tx.userSection.deleteMany({ where: { sectionId: { in: sectionIds } } })
  }

  await tx.sectionTurnout.deleteMany({ where: { electionId } })
  await tx.section.deleteMany({ where: { electionId } })
  await tx.candidate.deleteMany({ where: { list: { electionId } } })
  await tx.electionList.deleteMany({ where: { electionId } })
}

async function applyBackupToElection(
  tx: Prisma.TransactionClient,
  electionId: number,
  payload: ElectionBackupPayload
) {
  const e = payload.election
  await tx.election.update({
    where: { id: electionId },
    data: {
      name: e.name,
      commune: e.commune,
      date: new Date(e.date),
      type: e.type,
      totalSeats: e.totalSeats,
      threshold: e.threshold,
      status: e.status,
      archived: e.archived,
      notes: e.notes,
      eligibleVotersTotal: e.eligibleVotersTotal,
      registeredVoters: e.registeredVoters,
      turnoutVoters: e.turnoutVoters,
      turnoutPercent: e.turnoutPercent,
      ballotsBlank: e.ballotsBlank,
      ballotsInvalidInclBlank: e.ballotsInvalidInclBlank,
    },
  })

  const sectionIdByNumber = new Map<number, number>()
  for (const s of payload.sections) {
    const row = await tx.section.create({
      data: {
        electionId,
        number: s.number,
        name: s.name,
        location: s.location,
        theoreticalVoters: s.theoreticalVoters,
        order: s.order,
        locked: s.locked,
      },
    })
    sectionIdByNumber.set(s.number, row.id)
  }

  const listIdByKey = new Map<string, number>()
  const candidateIdByListAndKey = new Map<string, number>()

  for (const l of payload.lists) {
    const row = await tx.electionList.create({
      data: {
        electionId,
        name: l.name,
        shortName: l.shortName,
        color: l.color,
        listLogoUrl: l.listLogoUrl,
        coalitionLogoUrl: l.coalitionLogoUrl,
        candidateMayor: l.candidateMayor,
        coalition: l.coalition,
        order: l.order,
        notes: l.notes,
        importedSeats: l.importedSeats,
      },
    })
    listIdByKey.set(listKey(l.name), row.id)
    for (const c of l.candidates) {
      const cand = await tx.candidate.create({
        data: {
          listId: row.id,
          firstName: normalizeNamePartDisplay(c.firstName),
          lastName: normalizeNamePartDisplay(c.lastName),
          order: c.order,
          gender: c.gender,
        },
      })
      candidateIdByListAndKey.set(`${listKey(l.name)}:${candidateKey(c.firstName, c.lastName)}`, cand.id)
    }
  }

  for (const t of payload.turnouts) {
    const sectionId = sectionIdByNumber.get(t.sectionNumber)
    if (!sectionId) continue
    await tx.sectionTurnout.create({
      data: {
        sectionId,
        electionId,
        votersActual: t.votersActual,
        ballotsValid: t.ballotsValid,
        ballotsNull: t.ballotsNull,
        ballotsBlank: t.ballotsBlank,
        enteredBy: t.enteredBy,
        enteredAt: new Date(t.enteredAt),
        updatedAt: new Date(t.updatedAt),
      },
    })
  }

  for (const r of payload.listResults) {
    const sectionId = sectionIdByNumber.get(r.sectionNumber)
    const listId = listIdByKey.get(listKey(r.listName))
    if (!sectionId || !listId) continue

    const result = await tx.sectionListResult.create({
      data: {
        sectionId,
        listId,
        listVotes: r.listVotes,
        enteredBy: r.enteredBy,
        enteredAt: new Date(r.enteredAt),
        updatedAt: new Date(r.updatedAt),
      },
    })

    for (const p of r.preferences) {
      const candId = candidateIdByListAndKey.get(
        `${listKey(r.listName)}:${candidateKey(p.candidateFirstName, p.candidateLastName)}`
      )
      if (!candId) continue
      await tx.candidatePreference.create({
        data: {
          sectionResultId: result.id,
          candidateId: candId,
          votes: p.votes,
          enteredBy: p.enteredBy,
          updatedAt: new Date(p.updatedAt),
        },
      })
    }
  }
}

export async function restoreElectionBackupCreate(
  payload: ElectionBackupPayload
): Promise<{ electionId: number }> {
  const e = payload.election
  return prisma.$transaction(async tx => {
    const created = await tx.election.create({
      data: {
        name: `${e.name} (ripristino)`,
        commune: e.commune,
        date: new Date(e.date),
        type: e.type,
        totalSeats: e.totalSeats,
        threshold: e.threshold,
        status: e.status,
        archived: e.archived,
        notes: e.notes
          ? `${e.notes}\n\nRipristinato da backup del ${payload.exportedAt}`
          : `Ripristinato da backup del ${payload.exportedAt}`,
        eligibleVotersTotal: e.eligibleVotersTotal,
        registeredVoters: e.registeredVoters,
        turnoutVoters: e.turnoutVoters,
        turnoutPercent: e.turnoutPercent,
        ballotsBlank: e.ballotsBlank,
        ballotsInvalidInclBlank: e.ballotsInvalidInclBlank,
      },
    })
    const restorePayload: ElectionBackupPayload = {
      ...payload,
      election: {
        ...e,
        name: created.name,
        notes: created.notes ?? e.notes,
      },
    }
    await applyBackupToElection(tx, created.id, restorePayload)
    return { electionId: created.id }
  })
}

export async function restoreElectionBackupOverwrite(
  electionId: number,
  payload: ElectionBackupPayload
): Promise<{ electionId: number }> {
  const existing = await prisma.election.findUnique({ where: { id: electionId } })
  if (!existing) throw new Error('Elezione non trovata')

  await prisma.$transaction(async tx => {
    await wipeElectionContent(tx, electionId)
    await applyBackupToElection(tx, electionId, payload)
  })

  return { electionId }
}

export function electionNamesMatchForConfirm(a: string, b: string): boolean {
  return normKey(a) === normKey(b)
}
