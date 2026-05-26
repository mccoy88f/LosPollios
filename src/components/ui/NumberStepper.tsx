import { cn } from '@/lib/cn'
import { Minus, Plus } from 'lucide-react'

type Tone = 'brand' | 'accent'

const toneBtn: Record<Tone, string> = {
  brand:
    'border-gray-300 dark:border-neutral-600 text-brand-800 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-neutral-700 disabled:text-gray-400 dark:disabled:text-neutral-500',
  accent:
    'border-gray-300 dark:border-neutral-600 text-accent-700 dark:text-accent-300 hover:bg-accent-50 dark:hover:bg-neutral-700 disabled:text-gray-400 dark:disabled:text-neutral-500',
}

export function NumberStepper({
  value,
  onChange,
  onStep,
  onBlurCommit,
  min = 0,
  disabled,
  tone = 'brand',
  inputClassName,
  className,
  'aria-label': ariaLabel,
  onActivate,
}: {
  value: string
  onChange: (value: string) => void
  /** +/−: salvataggio più rapido rispetto alla digitazione manuale */
  onStep?: (value: string) => void
  /** Uscita dal campo: commit immediato (es. dopo debounce preferenze) */
  onBlurCommit?: () => void
  min?: number
  disabled?: boolean
  tone?: Tone
  inputClassName?: string
  className?: string
  'aria-label'?: string
  /** Chiamato su +/− o focus input (es. aprire accordion lista) */
  onActivate?: () => void
}) {
  const n = Number(value) || 0

  function bump(delta: number) {
    onActivate?.()
    const next = String(Math.max(min, n + delta))
    if (onStep) onStep(next)
    else onChange(next)
  }

  const btnClass = cn(
    'w-10 shrink-0 flex items-center justify-center border-gray-300 transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500',
    toneBtn[tone]
  )

  return (
    <div
      className={cn(
        'inline-flex items-stretch rounded-lg border border-gray-300 dark:border-neutral-600 overflow-hidden bg-white dark:bg-neutral-800',
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => bump(1)}
        className={cn(btnClass, 'border-r')}
        aria-label="Aumenta"
      >
        <Plus className="w-4 h-4" />
      </button>
      <input
        type="number"
        min={min}
        value={value}
        disabled={disabled}
        onFocus={() => onActivate?.()}
        onChange={e => {
          onActivate?.()
          onChange(e.target.value)
        }}
        onBlur={() => onBlurCommit?.()}
        className={cn(
          'w-24 text-center font-semibold tabular-nums border-0 focus:ring-0 focus:outline-none py-2',
          'bg-transparent text-gray-900 dark:text-white',
          'disabled:bg-gray-100 dark:disabled:bg-neutral-900 disabled:text-gray-500 dark:disabled:text-neutral-400',
          inputClassName
        )}
      />
      <button
        type="button"
        disabled={disabled || n <= min}
        onClick={() => bump(-1)}
        className={cn(btnClass, 'border-l')}
        aria-label="Diminuisci"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  )
}
