'use client'

import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { SectionUiStatus } from '@/lib/sectionStatus'

export type EntrySectionTab = {
  id: number
  number: number
  status: SectionUiStatus
}

const tabStatusClass: Record<SectionUiStatus, string> = {
  pending: 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
  in_progress: 'border-orange-400 bg-orange-50 text-orange-950 hover:bg-orange-100',
  closed: 'border-emerald-400 bg-emerald-50 text-emerald-950 hover:bg-emerald-100',
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
                tabStatusClass[s.status],
                active && 'border-brand-800 bg-brand-800 text-white shadow-sm scale-[1.02]'
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
