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
