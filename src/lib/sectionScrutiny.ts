/** Liste con almeno un voto lista o preferenza registrata. */
export function countSectionListsFilled(
  results: { listVotes: number; preferences?: { votes: number }[] }[]
): number {
  return results.filter(
    r => r.listVotes > 0 || (r.preferences?.some(p => p.votes > 0) ?? false)
  ).length
}

/**
 * Percentuale avanzamento spoglio per singola sezione (0–100).
 * Con 0 votanti: 0% (nessun riempimento). Con votanti > 0: 50% affluenza, poi 50–100% per liste.
 */
export function sectionScrutinyPercent(
  locked: boolean,
  votersActual: number | null | undefined,
  listsFilled: number,
  totalLists: number
): number {
  if (locked) return 100

  const voters = votersActual ?? 0
  if (voters <= 0) return 0

  const total = Math.max(0, totalLists)
  const filled = Math.max(0, Math.min(listsFilled, total))

  if (total > 0 && filled >= total) return 100
  if (filled > 0) {
    return Math.round(50 + 50 * (filled / total))
  }
  return 50
}
