export type SectionUiStatus = 'pending' | 'in_progress' | 'closed'

export function sectionHasEntryData(votersActual: number | null | undefined, hasVotes: boolean): boolean {
  return (votersActual ?? 0) > 0 || hasVotes
}

export function resolveSectionUiStatus(locked: boolean, hasData: boolean): SectionUiStatus {
  if (locked) return 'closed'
  if (hasData) return 'in_progress'
  return 'pending'
}

export const sectionStatusLabels: Record<SectionUiStatus, string> = {
  pending: 'Da compilare',
  in_progress: 'In corso',
  closed: 'Scrutinio terminato',
}
