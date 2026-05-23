/**
 * Coalizioni «definite» nell’elezione: almeno due liste con il campo coalizione compilato
 * (una sola lista con etichetta non basta per la vista raggruppata).
 */
export function electionHasCoalitions(lists: { coalition: string | null }[]): boolean {
  let withCoalition = 0
  for (const l of lists) {
    if (typeof l.coalition === 'string' && l.coalition.trim() !== '') withCoalition++
    if (withCoalition >= 2) return true
  }
  return false
}

export type LiveViewId =
  | 'panorama'
  | 'liste'
  | 'sezioni'
  | 'coalizioni'
  | 'analisi'
  | 'preferenze'
  | 'aggiornamenti'

export const LIVE_VIEW_IDS: LiveViewId[] = [
  'panorama',
  'liste',
  'sezioni',
  'coalizioni',
  'analisi',
  'preferenze',
  'aggiornamenti',
]

export function isLiveViewId(v: string | null): v is LiveViewId {
  return v != null && (LIVE_VIEW_IDS as string[]).includes(v)
}

/** Compat: vecchi link ?view=seggi */
export function normalizeLiveViewParam(v: string | null): LiveViewId | null {
  if (v === 'seggi') return 'analisi'
  return isLiveViewId(v) ? v : null
}
