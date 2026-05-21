/** 12 colori distinti per sezione (barra di avanzamento spoglio). */
export const SECTION_FILL_HEX = [
  '#f59e0b',
  '#f97316',
  '#f43f5e',
  '#d946ef',
  '#8b5cf6',
  '#059669',
  '#65a30d',
  '#ca8a04',
  '#dc2626',
  '#0d9488',
  '#78716c',
  '#E18901',
] as const

export function getSectionColorIndex(sectionNumber: number): number {
  const n = Math.max(1, Math.floor(sectionNumber))
  return (n - 1) % SECTION_FILL_HEX.length
}

export function getSectionFillColor(sectionNumber: number): string {
  return SECTION_FILL_HEX[getSectionColorIndex(sectionNumber)]
}
