/** Almeno una lista con campo «coalizione» compilato in admin */
export function electionHasCoalitions(lists: { coalition: string | null }[]): boolean {
  return lists.some(l => typeof l.coalition === 'string' && l.coalition.trim() !== '')
}

export type LiveViewId =
  | 'panorama'
  | 'liste'
  | 'sezioni'
  | 'coalizioni'
  | 'analisi'
  | 'preferenze'

export const LIVE_VIEW_IDS: LiveViewId[] = [
  'panorama',
  'liste',
  'sezioni',
  'coalizioni',
  'analisi',
  'preferenze',
]

export function isLiveViewId(v: string | null): v is LiveViewId {
  return v != null && (LIVE_VIEW_IDS as string[]).includes(v)
}

/** Compat: vecchi link ?view=seggi */
export function normalizeLiveViewParam(v: string | null): LiveViewId | null {
  if (v === 'seggi') return 'analisi'
  return isLiveViewId(v) ? v : null
}
