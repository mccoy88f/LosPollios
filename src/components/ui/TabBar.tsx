'use client'

import { cn } from '@/lib/cn'
import type { LucideIcon } from 'lucide-react'

export type TabItem<T extends string> = {
  id: T
  label: string
  icon?: LucideIcon
}

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit',
        className
      )}
      role="tablist"
    >
      {tabs.map(tab => {
        const Icon = tab.icon
        const active = value === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
              active ? 'bg-brand-800 text-white' : 'text-gray-900 hover:bg-gray-100'
            )}
          >
            {Icon ? <Icon className="w-4 h-4 shrink-0" aria-hidden /> : null}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
