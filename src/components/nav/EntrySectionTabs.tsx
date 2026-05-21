'use client'

import Link from 'next/link'
import { cn } from '@/lib/cn'
import { getSectionColors } from '@/lib/sectionColors'
import type { SectionUiStatus } from '@/lib/sectionStatus'

export type EntrySectionTab = {
  id: number
  number: number
  status: SectionUiStatus
}

type Props = {
  electionId: number
  sections: EntrySectionTab[]
  currentSectionId: number
  currentSectionNumber: number
}

export function EntrySectionTabs({
  electionId,
  sections,
  currentSectionId,
  currentSectionNumber,
}: Props) {
  return (
    <div className="space-y-2 py-1">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Sezioni</p>
        <p className="text-sm text-gray-900">
          Attiva:{' '}
          <span className="font-bold text-brand-800 tabular-nums">n. {currentSectionNumber}</span>
        </p>
      </div>
      <div
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 -mx-0.5 px-0.5"
        role="tablist"
        aria-label="Passa a un'altra sezione"
      >
        {sections.map(s => {
          const active = s.id === currentSectionId
          const colors = getSectionColors(s.number)
          return (
            <Link
              key={s.id}
              href={`/entry/${electionId}/${s.id}`}
              role="tab"
              aria-selected={active}
              aria-current={active ? 'page' : undefined}
              title={`Sezione ${s.number}`}
              className={cn(
                'shrink-0 min-w-[3rem] h-10 px-3 rounded-lg border-2 text-sm font-bold tabular-nums',
                'inline-flex items-center justify-center transition-all',
                !active && colors.card,
                !active && colors.darkCard,
                active && 'border-brand-800 bg-brand-800 text-white shadow-sm scale-[1.02] dark:border-brand-600 dark:bg-brand-700'
              )}
            >
              {s.number}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
