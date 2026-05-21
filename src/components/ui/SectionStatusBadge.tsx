import { cn } from '@/lib/cn'
import { getSectionFillColor } from '@/lib/sectionColors'
import { sectionScrutinyPercent } from '@/lib/sectionScrutiny'
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

export type SectionProgressInput = {
  sectionNumber: number
  locked: boolean
  votersActual: number | null
  listsFilled: number
  totalLists: number
  hasWarning?: boolean
}

function sectionProgressStyle(input: SectionProgressInput) {
  const pct = sectionScrutinyPercent(
    input.locked,
    input.votersActual,
    input.listsFilled,
    input.totalLists
  )
  const fill = getSectionFillColor(input.sectionNumber)
  return { pct, fill }
}

function SectionProgressFill({
  input,
  className,
}: {
  input: SectionProgressInput
  className?: string
}) {
  const { pct, fill } = sectionProgressStyle(input)
  return (
    <div
      className={cn(
        'absolute left-0 right-0 bottom-0 transition-[top] duration-500 ease-out pointer-events-none',
        className
      )}
      style={{
        top: pct <= 0 ? '100%' : `${100 - pct}%`,
        backgroundColor: fill,
      }}
      aria-hidden
    />
  )
}

/** Card sezione entry: barra di riempimento dal basso con colore sezione */
export function sectionEntryCardClasses(input: SectionProgressInput): string {
  return cn(
    'relative overflow-hidden rounded-xl border-2 border-gray-200 dark:border-neutral-700',
    'p-4 text-center hover:shadow-md transition-all min-h-[5.5rem]',
    'flex flex-col items-center justify-center gap-1',
    'bg-gray-100 dark:bg-neutral-900 text-gray-900 dark:text-white',
    input.hasWarning && 'ring-2 ring-amber-400 ring-offset-1 dark:ring-amber-500 dark:ring-offset-neutral-950'
  )
}

export function SectionEntryProgressFill(input: SectionProgressInput) {
  return <SectionProgressFill input={input} className="opacity-90 dark:opacity-80" />
}

/** Cella sezione live: barra di riempimento dal basso */
export function sectionLiveCellClasses(input: SectionProgressInput): string {
  return cn(
    'relative overflow-hidden aspect-square rounded flex items-center justify-center',
    'text-xs font-semibold tabular-nums transition-colors',
    'bg-gray-200 dark:bg-neutral-800 text-gray-800 dark:text-white border border-gray-300/80 dark:border-neutral-600',
    input.hasWarning && 'ring-2 ring-amber-500 ring-offset-1 ring-offset-white dark:ring-offset-neutral-950'
  )
}

export function SectionLiveProgressFill(input: SectionProgressInput) {
  return <SectionProgressFill input={input} />
}
