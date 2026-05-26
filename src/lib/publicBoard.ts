import { randomBytes } from 'crypto'
import prisma from '@/lib/db'
import { electionHasCoalitions } from '@/lib/liveElection'
import { countActivePublicBoardViewers } from '@/lib/publicBoardPresence'
import { countSectionListsFilled } from '@/lib/sectionScrutiny'
import { sectionScrutinyPercent } from '@/lib/sectionScrutiny'
import { resolveSectionUiStatus } from '@/lib/sectionStatus'
import { sectionHasEntryData } from '@/lib/sectionStatus'

export const PUBLIC_BOARD_REFRESH_MIN = 15
export const PUBLIC_BOARD_REFRESH_MAX = 300
export const PUBLIC_BOARD_REFRESH_DEFAULT = 60

export type PublicBoardPayload = {
  election: { name: string; commune: string }
  refreshSeconds: number
  progress: {
    totalSections: number
    sectionsWithTurnout: number
    sectionsWithVotes: number
    totalTheoreticalVoters: number
    totalActualVoters: number
    totalListVotes: number
    scrutinizedPercent: number
    turnoutPercent: number
  }
  hasCoalitions: boolean
  lists: {
    listId: number
    name: string
    shortName: string | null
    color: string
    votes: number
    /** % sul totale voti di lista */
    percent: number
    /** % sui votanti (come live) */
    pctOnVoters: number
    coalition: string | null
    candidateMayor: string | null
    listLogoUrl: string | null
    coalitionLogoUrl: string | null
  }[]
  sections: {
    number: number
    name: string | null
    locked: boolean
    status: 'pending' | 'in_progress' | 'closed'
    votersActual: number | null
    listVotesSum: number
    scrutinyPercent: number
    listsFilled: number
    totalLists: number
  }[]
  updatedAt: string
  /** Spettatori con heartbeat negli ultimi ~90 s (stima simultanei) */
  activeViewers: number
}

type CacheEntry = { expiresAt: number; json: string; refreshSeconds: number }

const snapshotCache = new Map<string, CacheEntry>()

export function generatePublicBoardToken(): string {
  return randomBytes(18).toString('base64url')
}

export function clampPublicBoardRefreshSeconds(n: number): number {
  if (!Number.isFinite(n)) return PUBLIC_BOARD_REFRESH_DEFAULT
  return Math.min(PUBLIC_BOARD_REFRESH_MAX, Math.max(PUBLIC_BOARD_REFRESH_MIN, Math.round(n)))
}

export function invalidatePublicBoardCache(token?: string | null) {
  if (token) snapshotCache.delete(token)
  else snapshotCache.clear()
}

export async function buildPublicBoardPayload(electionId: number): Promise<PublicBoardPayload | null> {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: {
      name: true,
      commune: true,
      publicBoardEnabled: true,
      publicBoardRefreshSeconds: true,
      lists: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          shortName: true,
          color: true,
          coalition: true,
          candidateMayor: true,
          listLogoUrl: true,
          coalitionLogoUrl: true,
        },
      },
    },
  })
  if (!election?.publicBoardEnabled) return null

  const refreshSeconds = clampPublicBoardRefreshSeconds(election.publicBoardRefreshSeconds)

  const [sections, turnouts, listResults] = await Promise.all([
    prisma.section.findMany({
      where: { electionId },
      orderBy: { number: 'asc' },
      select: { id: true, number: true, name: true, locked: true, theoreticalVoters: true },
    }),
    prisma.sectionTurnout.findMany({
      where: { electionId },
      select: { sectionId: true, votersActual: true },
    }),
    prisma.sectionListResult.findMany({
      where: { section: { electionId } },
      select: { sectionId: true, listId: true, listVotes: true },
    }),
  ])

  const turnoutBySection = new Map(turnouts.map(t => [t.sectionId, t]))
  const resultsBySection = new Map<number, typeof listResults>()
  for (const r of listResults) {
    if (!resultsBySection.has(r.sectionId)) resultsBySection.set(r.sectionId, [])
    resultsBySection.get(r.sectionId)!.push(r)
  }

  const listVotesMap = new Map<number, number>()
  for (const r of listResults) {
    listVotesMap.set(r.listId, (listVotesMap.get(r.listId) ?? 0) + r.listVotes)
  }

  const totalTheoreticalVoters = sections.reduce((s, sec) => s + sec.theoreticalVoters, 0)
  const totalActualVoters = turnouts.reduce((s, t) => s + t.votersActual, 0)
  const totalListVotes = Array.from(listVotesMap.values()).reduce((s, v) => s + v, 0)
  const totalLists = election.lists.length

  let sectionsWithTurnout = 0
  let sectionsWithVotes = 0

  const sectionRows = sections.map(sec => {
    const turnoutRow = turnoutBySection.get(sec.id)
    const sectionResults = resultsBySection.get(sec.id) ?? []
    const votersActual = turnoutRow?.votersActual ?? null
    const listVotesSum = sectionResults.reduce((s, r) => s + r.listVotes, 0)
    const hasData = sectionHasEntryData(votersActual, sectionResults.some(r => r.listVotes > 0))
    const status = resolveSectionUiStatus(sec.locked, hasData)

    if ((votersActual ?? 0) > 0) sectionsWithTurnout++
    if (listVotesSum > 0) sectionsWithVotes++

    return {
      number: sec.number,
      name: sec.name,
      locked: sec.locked,
      status,
      votersActual,
      listVotesSum,
      scrutinyPercent: sectionScrutinyPercent(votersActual, listVotesSum),
      listsFilled: countSectionListsFilled(sectionResults),
      totalLists,
    }
  })

  const lists = election.lists.map(l => {
    const votes = listVotesMap.get(l.id) ?? 0
    return {
      listId: l.id,
      name: l.name,
      shortName: l.shortName,
      color: l.color,
      votes,
      percent: totalListVotes > 0 ? (votes / totalListVotes) * 100 : 0,
      pctOnVoters: totalActualVoters > 0 ? (votes / totalActualVoters) * 100 : 0,
      coalition: l.coalition,
      candidateMayor: l.candidateMayor,
      listLogoUrl: l.listLogoUrl,
      coalitionLogoUrl: l.coalitionLogoUrl,
    }
  })

  const hasCoalitions = electionHasCoalitions(lists)

  return {
    election: { name: election.name, commune: election.commune },
    refreshSeconds,
    hasCoalitions,
    progress: {
      totalSections: sections.length,
      sectionsWithTurnout,
      sectionsWithVotes,
      totalTheoreticalVoters,
      totalActualVoters,
      totalListVotes,
      scrutinizedPercent:
        totalActualVoters > 0 ? Math.min(100, (totalListVotes / totalActualVoters) * 100) : 0,
      turnoutPercent:
        totalTheoreticalVoters > 0 ? (totalActualVoters / totalTheoreticalVoters) * 100 : 0,
    },
    lists,
    sections: sectionRows,
    updatedAt: new Date().toISOString(),
    activeViewers: 0,
  }
}

export async function getPublicBoardByToken(token: string): Promise<{
  json: string
  refreshSeconds: number
} | null> {
  const now = Date.now()
  const cached = snapshotCache.get(token)
  if (cached && cached.expiresAt > now) {
    const payload = JSON.parse(cached.json) as PublicBoardPayload
    payload.activeViewers = await countActivePublicBoardViewers(token)
    return { json: JSON.stringify(payload), refreshSeconds: cached.refreshSeconds }
  }

  const election = await prisma.election.findFirst({
    where: { publicBoardToken: token, publicBoardEnabled: true },
    select: { id: true, publicBoardRefreshSeconds: true },
  })
  if (!election) return null

  const payload = await buildPublicBoardPayload(election.id)
  if (!payload) return null

  const refreshSeconds = payload.refreshSeconds
  payload.activeViewers = await countActivePublicBoardViewers(token)
  const json = JSON.stringify(payload)
  snapshotCache.set(token, {
    expiresAt: now + refreshSeconds * 1000,
    json,
    refreshSeconds,
  })

  return { json, refreshSeconds }
}

export function publicBoardUrl(token: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/public/${token}`
}
