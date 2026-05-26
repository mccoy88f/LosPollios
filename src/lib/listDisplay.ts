/**
 * Etichetta principale lista: campo «Nome lista» (name), non la sigla.
 * Se in admin i campi sono invertiti (sigla in name, nome lungo in shortName), usa il testo più lungo.
 */
export function listPrimaryLabel(name: string, shortName?: string | null): string {
  const full = name?.trim() ?? ''
  const sigla = shortName?.trim() ?? ''
  if (!full && sigla) return sigla
  if (!sigla || full === sigla) return full
  if (full.length <= 10 && sigla.length > full.length && /\s/.test(sigla)) return sigla
  return full
}

/** Sigla da mostrare in seconda riga, solo se diversa dal nome principale. */
export function listSiglaSubtitle(name: string, shortName?: string | null): string | null {
  const primary = listPrimaryLabel(name, shortName)
  const sigla = shortName?.trim() ?? ''
  if (!sigla || sigla === primary) return null
  return sigla
}
