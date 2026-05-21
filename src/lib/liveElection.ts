/** Almeno una lista con campo «coalizione» compilato in admin */
export function electionHasCoalitions(lists: { coalition: string | null }[]): boolean {
  return lists.some(l => typeof l.coalition === 'string' && l.coalition.trim() !== '')
}

export type LiveViewId = 'panorama' | 'liste' | 'sezioni' | 'coalizioni' | 'seggi' | 'preferenze'

export const LIVE_VIEW_IDS: LiveViewId[] = [
  'panorama',
  'liste',
  'sezioni',
  'coalizioni',
  'seggi',
  'preferenze',
]

export function isLiveViewId(v: string | null): v is LiveViewId {
  return v != null && (LIVE_VIEW_IDS as string[]).includes(v)
}
