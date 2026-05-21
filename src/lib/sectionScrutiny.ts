/** Percentuale avanzamento spoglio per singola sezione (0–100). */
export function sectionScrutinyPercent(
  locked: boolean,
  hasTurnout: boolean,
  hasResults: boolean
): number {
  if (locked) return 100
  if (hasResults) return 100
  if (hasTurnout) return 50
  return 0
}
