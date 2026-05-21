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
  pending: 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
  in_progress: 'border-orange-300 bg-orange-50 text-orange-900 hover:border-orange-400',
  closed: 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-400',
}

const tabActiveClass: Record<SectionUiStatus, string> = {
  pending: 'ring-2 ring-accent-500 ring-offset-1 border-accent-400',
  in_progress: 'ring-2 ring-accent-500 ring-offset-1',
  closed: 'ring-2 ring-accent-500 ring-offset-1',
}

type Props = {
  electionId: number
  sections: EntrySectionTab[]
  currentSectionId: number
}

export function EntrySectionTabs({ electionId, sections, currentSectionId }: Props) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 -mx-1 px-1 scrollbar-thin"
      role="tablist"
      aria-label="Sezioni elettorali"
    >
      {sections.map(s => {
        const active = s.id === currentSectionId
        return (
          <Link
            key={s.id}
            href={`/entry/${electionId}/${s.id}`}
            role="tab"
            aria-selected={active}
            className={cn(
              'shrink-0 min-w-[2.75rem] px-3 py-1.5 rounded-lg border text-sm font-bold tabular-nums transition-all',
              tabStatusClass[s.status],
              active && tabActiveClass[s.status]
            )}
          >
            {s.number}
          </Link>
        )
      })}
    </div>
  )
}
