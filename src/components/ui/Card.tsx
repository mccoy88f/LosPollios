import { cn } from '@/lib/cn'
import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pt-5 pb-0', className)} {...props} />
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description ? <p className="text-gray-500 text-sm mt-1">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
    </div>
  )
}
