/** Chiavi di confronto storico (sindaco o coalizione). */

export type HistListRow = {
  listName: string
  coalition: string | null
  candidateMayor: string | null
  votes: number
  percentage: number
  seats: number | null
}

export type HistElectionSnapshot = {
  id: number
  name: string
  year: number
  registeredVoters: number | null
  turnoutVoters: number | null
  turnoutPercent: number | null
  results: HistListRow[]
  isCurrent?: boolean
}

export type CompareKeyKind = 'mayor' | 'coalition'

export type CompareKey = {
  kind: CompareKeyKind
  key: string
  label: string
}

export function normCompareKey(s: string | null | undefined): string {
  if (s == null || !String(s).trim()) return ''
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Sindaco e, se richiesto, anche coalizione (due serie distinte quando entrambi valorizzati). */
export function compareKeysFromRow(
  row: { candidateMayor?: string | null; coalition?: string | null; listName: string },
  includeCoalition: boolean
): CompareKey[] {
  const keys: CompareKey[] = []
  const mayor = normCompareKey(row.candidateMayor)
  const coal = normCompareKey(row.coalition)
  if (mayor) keys.push({ kind: 'mayor', key: mayor, label: row.candidateMayor!.trim() })
  if (includeCoalition && coal) {
    keys.push({ kind: 'coalition', key: coal, label: row.coalition!.trim() })
  }
  return keys
}

function rowMatchesKey(row: HistListRow, compare: CompareKey): boolean {
  if (compare.kind === 'mayor') {
    return normCompareKey(row.candidateMayor) === compare.key
  }
  return normCompareKey(row.coalition) === compare.key
}

/** Quota % voti di lista per sindaco o coalizione in un'elezione. */
export function shareForCompareKey(election: HistElectionSnapshot, compare: CompareKey): number | null {
  const matched = election.results.filter(r => rowMatchesKey(r, compare))
  if (matched.length === 0) return null
  const totalVotes = election.results.reduce((s, r) => s + r.votes, 0)
  if (totalVotes <= 0) return null
  const keyVotes = matched.reduce((s, r) => s + r.votes, 0)
  return (keyVotes / totalVotes) * 100
}

export type CompareSeriesPoint = { yearLabel: string; year: number; percentage: number; isCurrent?: boolean }

export type CompareSeries = {
  compare: CompareKey
  points: CompareSeriesPoint[]
  hasHistoricalMatch: boolean
}

/** Serie storiche per ogni sindaco/coalizione presente nell'elezione attuale. */
export function buildCompareSeries(
  current: HistElectionSnapshot,
  historical: HistElectionSnapshot[],
  includeCoalition: boolean
): CompareSeries[] {
  const keys = new Map<string, CompareKey>()
  for (const row of current.results) {
    for (const ck of compareKeysFromRow(row, includeCoalition)) {
      keys.set(`${ck.kind}:${ck.key}`, ck)
    }
  }

  const elections = [current, ...historical.sort((a, b) => a.year - b.year)]

  return Array.from(keys.values()).map(compare => {
    const points: CompareSeriesPoint[] = []
    let hasHistoricalMatch = false

    for (const el of elections) {
      const pct = shareForCompareKey(el, compare)
      if (pct == null) continue
      if (!el.isCurrent) hasHistoricalMatch = true
      points.push({
        yearLabel: el.isCurrent ? 'Attuale' : String(el.year),
        year: el.year,
        percentage: pct,
        isCurrent: el.isCurrent,
      })
    }

    return { compare, points, hasHistoricalMatch }
  })
}

export function listHasHistoricalMatch(
  row: HistListRow,
  historical: HistElectionSnapshot[],
  includeCoalition: boolean
): boolean {
  const keys = compareKeysFromRow(row, includeCoalition)
  if (keys.length === 0) return false
  return keys.some(ck => historical.some(h => shareForCompareKey(h, ck) != null))
}
