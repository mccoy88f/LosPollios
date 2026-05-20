import { cn } from '@/lib/cn'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

type Variant = 'info' | 'success' | 'warning' | 'error'

const styles: Record<Variant, { box: string; icon: typeof Info }> = {
  info: { box: 'bg-brand-50 border-brand-200 text-brand-950', icon: Info },
  success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-900', icon: CheckCircle2 },
  warning: { box: 'bg-amber-50 border-amber-200 text-amber-950', icon: TriangleAlert },
  error: { box: 'bg-red-50 border-red-200 text-red-900', icon: AlertCircle },
}

export function Alert({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: Variant
  title?: string
  children: ReactNode
  className?: string
}) {
  const Icon = styles[variant].icon
  return (
    <div
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
      className={cn('rounded-xl border px-4 py-3 text-sm flex gap-3', styles[variant].box, className)}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5 opacity-80" aria-hidden />
      <div className="min-w-0">
        {title ? <p className="font-semibold mb-0.5">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  )
}
