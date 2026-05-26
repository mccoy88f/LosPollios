const STORAGE_KEY = 'lospollios_public_board_cid'

/** ID anonimo persistente per heartbeat presenza tabellone pubblico */
export function getPublicBoardClientId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}
