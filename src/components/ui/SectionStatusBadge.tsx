import { cn } from '@/lib/cn'
import { getSectionColors } from '@/lib/sectionColors'
import { sectionStatusLabels, type SectionUiStatus } from '@/lib/sectionStatus'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

const badgeConfig: Record<
  SectionUiStatus,
  { icon: typeof Circle; className: string }
> = {
  pending: {
    icon: Circle,
    className:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600',
  },
  in_progress: {
    icon: Clock,
    className:
      'bg-orange-50 text-orange-900 border-orange-200 dark:bg-neutral-800 dark:text-orange-300 dark:border-orange-600',
  },
  closed: {
    icon: CheckCircle2,
    className:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-neutral-800 dark:text-emerald-300 dark:border-emerald-600',
  },
}

export function SectionStatusBadge({
  status,
  size = 'sm',
  className,
}: {
  status: SectionUiStatus
  size?: 'sm' | 'md'
  className?: string
}) {
  const { icon: Icon, className: statusClass } = badgeConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium border rounded-full',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
        statusClass,
        className
      )}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden />
      {sectionStatusLabels[status]}
    </span>
  )
}

const statusRing: Record<SectionUiStatus, string> = {
  pending: '',
  in_progress: 'ring-2 ring-orange-400 dark:ring-orange-500',
  closed: 'ring-2 ring-emerald-500 dark:ring-emerald-500',
}

/** Classi per card/link sezione in griglia entry (colore per numero sezione) */
export function sectionEntryCardClasses(
  status: SectionUiStatus,
  sectionNumber: number,
  hasWarning?: boolean
): string {
  const colors = getSectionColors(sectionNumber)
  return cn(
    'rounded-xl border-2 p-4 text-center hover:shadow-md transition-all min-h-[5.5rem] flex flex-col items-center justify-center gap-1',
    colors.card,
    colors.darkCard,
    statusRing[status],
    hasWarning && 'ring-2 ring-amber-400 ring-offset-1 dark:ring-amber-500 dark:ring-offset-neutral-950'
  )
}

/** Classi per cella numerica in griglia live (colore per numero sezione) */
export function sectionLiveCellClasses(
  sectionNumber: number,
  hasWarning?: boolean
): string {
  const colors = getSectionColors(sectionNumber)
  return cn(
    'aspect-square rounded flex items-center justify-center text-xs font-semibold tabular-nums transition-colors border border-transparent',
    colors.cell,
    colors.darkCell,
    hasWarning && 'ring-2 ring-amber-500 ring-offset-1 ring-offset-white dark:ring-offset-neutral-950'
  )
}
