/**
 * Colori distinti per sezione (indice stabile dal numero sezione).
 * Evitiamo blu/slate; in dark mode base neutra scura + accento colorato.
 */
export type SectionColorSet = {
  card: string
  cell: string
  darkCard: string
  darkCell: string
}

/** 12 tonalità distinguibili, coerenti tra entry e live */
export const SECTION_COLOR_PALETTE: SectionColorSet[] = [
  {
    card: 'bg-amber-50 border-amber-400 text-amber-950',
    cell: 'bg-amber-500 text-white',
    darkCard: 'dark:bg-neutral-950 dark:border-amber-500 dark:text-white',
    darkCell: 'dark:bg-amber-600 dark:text-white',
  },
  {
    card: 'bg-orange-50 border-orange-400 text-orange-950',
    cell: 'bg-orange-500 text-white',
    darkCard: 'dark:bg-neutral-950 dark:border-orange-500 dark:text-white',
    darkCell: 'dark:bg-orange-600 dark:text-white',
  },
  {
    card: 'bg-rose-50 border-rose-400 text-rose-950',
    cell: 'bg-rose-500 text-white',
    darkCard: 'dark:bg-neutral-950 dark:border-rose-500 dark:text-white',
    darkCell: 'dark:bg-rose-600 dark:text-white',
  },
  {
    card: 'bg-fuchsia-50 border-fuchsia-400 text-fuchsia-950',
    cell: 'bg-fuchsia-500 text-white',
    darkCard: 'dark:bg-neutral-950 dark:border-fuchsia-500 dark:text-white',
    darkCell: 'dark:bg-fuchsia-600 dark:text-white',
  },
  {
    card: 'bg-violet-50 border-violet-400 text-violet-950',
    cell: 'bg-violet-500 text-white',
    darkCard: 'dark:bg-neutral-950 dark:border-violet-500 dark:text-white',
    darkCell: 'dark:bg-violet-600 dark:text-white',
  },
  {
    card: 'bg-emerald-50 border-emerald-400 text-emerald-950',
    cell: 'bg-emerald-600 text-white',
    darkCard: 'dark:bg-neutral-950 dark:border-emerald-500 dark:text-white',
    darkCell: 'dark:bg-emerald-600 dark:text-white',
  },
  {
    card: 'bg-lime-50 border-lime-500 text-lime-950',
    cell: 'bg-lime-600 text-lime-950',
    darkCard: 'dark:bg-neutral-950 dark:border-lime-500 dark:text-white',
    darkCell: 'dark:bg-lime-600 dark:text-neutral-950',
  },
  {
    card: 'bg-yellow-50 border-yellow-500 text-yellow-950',
    cell: 'bg-yellow-500 text-yellow-950',
    darkCard: 'dark:bg-neutral-950 dark:border-yellow-500 dark:text-white',
    darkCell: 'dark:bg-yellow-500 dark:text-neutral-950',
  },
  {
    card: 'bg-red-50 border-red-400 text-red-950',
    cell: 'bg-red-500 text-white',
    darkCard: 'dark:bg-neutral-950 dark:border-red-500 dark:text-white',
    darkCell: 'dark:bg-red-600 dark:text-white',
  },
  {
    card: 'bg-teal-50 border-teal-400 text-teal-950',
    cell: 'bg-teal-600 text-white',
    darkCard: 'dark:bg-neutral-950 dark:border-teal-500 dark:text-white',
    darkCell: 'dark:bg-teal-600 dark:text-white',
  },
  {
    card: 'bg-stone-100 border-stone-400 text-stone-900',
    cell: 'bg-stone-500 text-white',
    darkCard: 'dark:bg-neutral-950 dark:border-stone-400 dark:text-white',
    darkCell: 'dark:bg-stone-500 dark:text-white',
  },
  {
    card: 'bg-accent-50 border-accent-500 text-accent-950',
    cell: 'bg-accent-500 text-white',
    darkCard: 'dark:bg-neutral-950 dark:border-accent-500 dark:text-white',
    darkCell: 'dark:bg-accent-600 dark:text-white',
  },
]

export function getSectionColorIndex(sectionNumber: number): number {
  const n = Math.max(1, Math.floor(sectionNumber))
  return (n - 1) % SECTION_COLOR_PALETTE.length
}

export function getSectionColors(sectionNumber: number): SectionColorSet {
  return SECTION_COLOR_PALETTE[getSectionColorIndex(sectionNumber)]
}
