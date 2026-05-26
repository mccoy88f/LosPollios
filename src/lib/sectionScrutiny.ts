/** Liste con almeno un voto lista o preferenza registrata. */
export function countSectionListsFilled(
  results: { listVotes: number; preferences?: { votes: number }[] }[]
): number {
  return results.filter(
    r => r.listVotes > 0 || (r.preferences?.some(p => p.votes > 0) ?? false)
  ).length
}

/**
 * Percentuale riempimento sezione: voti di lista scrutinati / votanti (affluenza).
 * Senza votanti → 0% (cella grigia, nessun riempimento colorato).
 */
export function sectionScrutinyPercent(
  votersActual: number | null | undefined,
  listVotesSum: number
): number {
  const voters = votersActual ?? 0
  if (voters <= 0) return 0
  const votes = Math.max(0, listVotesSum)
  return Math.min(100, Math.round((votes / voters) * 100))
}

export function sectionScrutinyRatioLabel(
  listVotesSum: number,
  votersActual: number | null | undefined
): { ratio: string; percent: string } {
  const voters = votersActual ?? 0
  if (voters <= 0) {
    return { ratio: '— / —', percent: '—' }
  }
  return {
    ratio: `${listVotesSum.toLocaleString('it-IT')} / ${voters.toLocaleString('it-IT')}`,
    percent: `${sectionScrutinyPercent(votersActual, listVotesSum)}%`,
  }
}
