import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { NavCrumb } from '@/components/SiteTopNav'

type Props = {
  crumbs?: NavCrumb[]
  maxWidthClass?: string
  children?: React.ReactNode
}

export function ContextBar({ crumbs = [], maxWidthClass = 'max-w-7xl', children }: Props) {
  if (crumbs.length === 0 && !children) return null

  return (
    <div className="shrink-0 bg-white border-b border-gray-200">
      <div className={`${maxWidthClass} mx-auto px-4 py-2 space-y-2`}>
        {crumbs.length > 0 && (
          <nav
            aria-label="Percorso"
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-500 min-w-0"
          >
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <span className="text-gray-300 select-none" aria-hidden>/</span>}
                {c.href ? (
                  <Link href={c.href} className="text-brand-800 hover:text-accent-600 hover:underline truncate max-w-[12rem] sm:max-w-xs">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 font-medium truncate max-w-[14rem] sm:max-w-md">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {children ? <div className={cn(!crumbs.length && 'pt-0')}>{children}</div> : null}
      </div>
    </div>
  )
}
