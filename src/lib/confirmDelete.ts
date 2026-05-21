export function confirmDelete(message: string): boolean {
  return window.confirm(message)
}

/**
 * Due passaggi di conferma obbligatori prima di eliminazioni irreversibili (elezioni).
 */
export function confirmElectionDeletionTwice(params: {
  title: string
  detail: string
  finalPrompt: string
}): boolean {
  if (!window.confirm(`${params.title}\n\n${params.detail}`)) return false
  if (!window.confirm(params.finalPrompt)) return false
  return true
}

/** Due conferme prima di azzerare i dati inseriti da /entry (affluenze sezione, voti, preferenze). */
export function confirmClearEntryDataTwice(params: {
  electionName: string
  turnouts: number
  listResults: number
  preferences: number
}): boolean {
  const { electionName, turnouts, listResults, preferences } = params
  const total = turnouts + listResults + preferences
  const summary =
    total === 0
      ? 'Non risultano dati di inserimento da rimuovere.'
      : `Verranno eliminati: ${turnouts} affluenze di sezione, ${listResults} risultati lista, ${preferences} preferenze candidato.`

  if (
    !window.confirm(
      `Azzerare i dati di inserimento per «${electionName}»?\n\n${summary}\n\nRestano: sezioni, aventi diritto per sezione (configurazione), tetto comunale, affluenza/votanti a livello elezione, liste e candidati.`
    )
  ) {
    return false
  }
  if (
    !window.confirm(
      `Ultima conferma: svuotare tutti i dati inseriti da /entry per «${electionName}»? L’operazione non si può annullare.`
    )
  ) {
    return false
  }
  return true
}
