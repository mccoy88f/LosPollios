import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/utils'
import { getSectionFillColor } from '@/lib/sectionColors'
import { sectionScrutinyPercent, sectionScrutinyRatioLabel } from '@/lib/sectionScrutiny'
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
  listVotesSum: number
  hasWarning?: boolean
}

function hasVoters(input: SectionProgressInput): boolean {
  return (input.votersActual ?? 0) > 0
}

function sectionProgressStyle(input: SectionProgressInput) {
  const pct = sectionScrutinyPercent(input.votersActual, input.listVotesSum)
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
  const showFill = hasVoters(input) && pct > 0

  return (
    <>
      {showFill && (
        <div
          className={cn(
            'absolute left-0 right-0 bottom-0 transition-[top] duration-500 ease-out pointer-events-none',
            className
          )}
          style={{
            top: `${100 - pct}%`,
            backgroundColor: fill,
          }}
          aria-hidden
        />
      )}
      {input.locked && (
        <div
          className="absolute inset-0 pointer-events-none z-[1] opacity-60 dark:opacity-50"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 6px)',
          }}
          aria-hidden
        />
      )}
    </>
  )
}

/** Voti scrutinati / votanti e percentuale sotto il numero sezione */
export function SectionProgressMetrics({
  input,
  compact = false,
  variant = 'default',
}: {
  input: SectionProgressInput
  compact?: boolean
  /** `live`: % prima, poi rapporto scrutinati/votanti, poi voti mancanti (panoramica live). */
  variant?: 'default' | 'live'
}) {
  const { ratio, percent } = sectionScrutinyRatioLabel(input.listVotesSum, input.votersActual)
  const voters = input.votersActual ?? 0
  const remaining = voters > 0 ? Math.max(0, voters - input.listVotesSum) : null

  if (variant === 'live') {
    return (
      <div
        className={cn(
          'tabular-nums text-gray-800 dark:text-neutral-100 text-center leading-tight w-full min-w-0 flex flex-col gap-px items-center justify-end',
          compact ? 'text-[8px] sm:text-[9px]' : 'text-[10px] space-y-0'
        )}
      >
        <div className={cn(compact ? 'font-semibold' : 'font-semibold text-brand-800 dark:text-brand-300')}>
          {percent}
        </div>
        <div className={cn(compact ? 'leading-none opacity-95' : '', 'truncate max-w-full')}>{ratio}</div>
        {remaining != null && (
          <div className="leading-none opacity-85">
            {remaining === 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">0 rimanenti</span>
            ) : (
              <span>{formatNumber(remaining)} rimanenti</span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'tabular-nums text-gray-700 dark:text-neutral-200 leading-tight',
        compact ? 'text-[9px] sm:text-[10px] space-y-0' : 'text-xs space-y-0.5'
      )}
    >
      <div className={compact ? 'font-medium' : ''}>{ratio}</div>
      <div className={cn(compact ? 'opacity-90' : 'font-semibold text-brand-800 dark:text-brand-300')}>
        {percent}
      </div>
    </div>
  )
}

/** Card sezione entry: barra di riempimento dal basso con colore sezione */
export function sectionEntryCardClasses(input: SectionProgressInput): string {
  const empty = !hasVoters(input)
  return cn(
    'relative overflow-hidden rounded-xl border-2 p-4 text-center hover:shadow-md transition-all min-h-[6.5rem]',
    'flex flex-col items-center justify-center gap-1',
    empty
      ? 'bg-gray-300 dark:bg-neutral-700 border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-neutral-300'
      : 'bg-gray-100 dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-white',
    input.hasWarning && 'ring-2 ring-amber-400 ring-offset-1 dark:ring-amber-500 dark:ring-offset-neutral-950'
  )
}

export function SectionEntryProgressFill(input: SectionProgressInput) {
  return <SectionProgressFill input={input} className="opacity-90 dark:opacity-80" />
}

/** Cella sezione live: barra di riempimento dal basso */
export function sectionLiveCellClasses(input: SectionProgressInput): string {
  const empty = !hasVoters(input)
  return cn(
    'relative overflow-hidden rounded flex flex-col items-center justify-between gap-0',
    'text-xs font-semibold tabular-nums transition-colors w-full min-w-0 aspect-square max-w-none p-1',
    empty
      ? 'bg-gray-300 dark:bg-neutral-700 text-gray-600 dark:text-neutral-400 border border-gray-400/60 dark:border-neutral-600'
      : 'bg-gray-200 dark:bg-neutral-800 text-gray-800 dark:text-white border border-gray-300/80 dark:border-neutral-600',
    input.hasWarning && 'ring-2 ring-amber-500 ring-offset-1 ring-offset-white dark:ring-offset-neutral-950'
  )
}

export function SectionLiveProgressFill(input: SectionProgressInput) {
  return <SectionProgressFill input={input} />
}
