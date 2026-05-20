import { cn } from '@/lib/cn'
import { sectionStatusLabels, type SectionUiStatus } from '@/lib/sectionStatus'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

const config: Record<
  SectionUiStatus,
  { icon: typeof Circle; className: string }
> = {
  pending: {
    icon: Circle,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  in_progress: {
    icon: Clock,
    className: 'bg-orange-50 text-orange-900 border-orange-200',
  },
  closed: {
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
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
  const { icon: Icon, className: statusClass } = config[status]
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

/** Classi per card/link sezione in griglia entry */
export function sectionEntryCardClasses(status: SectionUiStatus, hasWarning?: boolean): string {
  const base =
    status === 'closed'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
      : status === 'in_progress'
        ? 'border-orange-300 bg-orange-50 text-orange-900'
        : 'border-gray-200 bg-white text-gray-800'
  return cn(
    'rounded-xl border-2 p-4 text-center hover:shadow-md transition-all min-h-[5.5rem] flex flex-col items-center justify-center gap-1',
    base,
    hasWarning && 'ring-2 ring-amber-400 ring-offset-1'
  )
}

/** Classi per cella numerica in griglia live */
export function sectionLiveCellClasses(status: SectionUiStatus, hasWarning?: boolean): string {
  const fill =
    status === 'closed'
      ? 'bg-emerald-500 text-white'
      : status === 'in_progress'
        ? 'bg-orange-400 text-orange-950'
        : 'bg-gray-100 text-gray-500'
  return cn(
    'aspect-square rounded flex items-center justify-center text-xs font-semibold tabular-nums transition-colors',
    fill,
    hasWarning && 'ring-2 ring-amber-500 ring-offset-1 ring-offset-white'
  )
}
