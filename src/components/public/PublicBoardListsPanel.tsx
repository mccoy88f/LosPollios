'use client'

import { useMemo } from 'react'
import type { PublicBoardListItem } from '@/lib/publicBoardGrouping'
import {
  buildPublicBoardListLayout,
  type PublicBoardCoalitionBlock,
} from '@/lib/publicBoardGrouping'
import { cn } from '@/lib/cn'

type ListInput = {
  listId: number
  name: string
  shortName: string | null
  color: string
  votes: number
  percent: number
  pctOnVoters: number
  coalition: string | null
  candidateMayor: string | null
  listLogoUrl: string | null
  coalitionLogoUrl: string | null
}

type RestRow =
  | { kind: 'list'; list: PublicBoardListItem }
  | { kind: 'coalition'; coalition: PublicBoardCoalitionBlock }

/** Testo chiaro per la quota list: su votanti se noti, altrimenti quota sul cumulo voti di lista scrutinati */
function listPercentSubtitle(
  totalVoters: number,
  pctOnVoters: number,
  percentOfListVotes: number
): string {
  if (totalVoters > 0) return `${pctOnVoters.toFixed(1)}% su votanti`
  return `${percentOfListVotes.toFixed(1)}% su voti lista scrutinati`
}

function displayListLabel(list: Pick<PublicBoardListItem, 'shortName' | 'name'>): string {
  const short = list.shortName?.trim()
  if (short) return short
  const words = list.name
    .split(/\s+/)
    .map(w => w.trim())
    .filter(Boolean)
  if (words.length === 0) return list.name
  if (words.length === 1) return words[0].slice(0, 12).toUpperCase()
  return words
    .slice(0, 4)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function PublicBoardListsPanel({
  lists,
  totalVoters,
}: {
  lists: ListInput[]
  totalVoters: number
}) {
  const items: PublicBoardListItem[] = useMemo(
    () =>
      lists.map(l => ({
        listId: l.listId,
        name: l.name,
        shortName: l.shortName,
        color: l.color,
        votes: l.votes,
        percentOfListVotes: l.percent,
        pctOnVoters: l.pctOnVoters,
        coalition: l.coalition,
        candidateMayor: l.candidateMayor,
        listLogoUrl: l.listLogoUrl,
        coalitionLogoUrl: l.coalitionLogoUrl,
      })),
    [lists]
  )

  const layout = useMemo(
    () => buildPublicBoardListLayout(items, totalVoters),
    [items, totalVoters]
  )

  const totalListVotes = useMemo(() => items.reduce((s, l) => s + l.votes, 0), [items])

  const restRows: RestRow[] = useMemo(() => {
    if (layout.mode === 'coalitions') {
      const rows: RestRow[] = []
      for (const c of layout.heroCoalitions) {
        for (const l of c.moreLists) rows.push({ kind: 'list', list: l })
      }
      for (const c of layout.restCoalitions) rows.push({ kind: 'coalition', coalition: c })
      for (const l of layout.standaloneLists) rows.push({ kind: 'list', list: l })
      return rows
    }
    return layout.restLists.map(list => ({ kind: 'list' as const, list }))
  }, [layout])

  if (!lists.length) {
    return (
      <p className="flex-1 flex items-center justify-center text-slate-400 dark:text-neutral-500 text-xs">Nessuna lista</p>
    )
  }

  const heroCoalitionCount = layout.mode === 'coalitions' ? layout.heroCoalitions.length : 0

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1 p-1 sm:p-1.5 overflow-hidden">
      <div
        className={cn(
          'min-h-0 grid gap-1.5 flex-[3]',
          heroCoalitionCount > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {layout.mode === 'coalitions' ? (
          layout.heroCoalitions.map(c => (
            <CoalitionHero key={c.name} block={c} totalVoters={totalVoters} totalListVotes={totalListVotes} />
          ))
        ) : (
          layout.heroLists.map(l => (
            <ListHero key={l.listId} list={l} totalVoters={totalVoters} />
          ))
        )}
      </div>

      {restRows.length > 0 && (
        <div className="flex-[2] min-h-0 flex flex-col overflow-hidden border-t border-slate-100 dark:border-neutral-700 pt-1">
          <p className="shrink-0 text-[clamp(0.5rem,1.6vw,0.625rem)] text-slate-400 dark:text-neutral-500 uppercase tracking-wide px-1 mb-0.5">
            {layout.mode === 'coalitions' ? 'Altre coalizioni e liste' : 'Altre liste'}
          </p>
          <div className="flex-1 min-h-0 flex flex-col">
            {restRows.map(row =>
              row.kind === 'coalition' ? (
                <CompactListRow
                  key={`c-${row.coalition.name}`}
                  coalition={row.coalition}
                  totalVoters={totalVoters}
                  totalListVotes={totalListVotes}
                />
              ) : (
                <CompactListRow key={row.list.listId} list={row.list} totalVoters={totalVoters} />
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CompactListRow({
  list,
  coalition,
  totalVoters,
  totalListVotes = 0,
}: {
  list?: PublicBoardListItem
  coalition?: PublicBoardCoalitionBlock
  totalVoters: number
  totalListVotes?: number
}) {
  if (coalition) {
    const listCount = coalition.topLists.length + coalition.moreLists.length
    return (
      <div className="flex-1 min-h-0 flex items-center gap-1.5 px-1.5 overflow-hidden">
        {coalition.coalitionLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coalition.coalitionLogoUrl} alt="" className="w-5 h-5 object-contain shrink-0" />
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: coalition.color }} />
        )}
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium text-[clamp(0.55rem,1.9vw,0.75rem)]">{coalition.name}</p>
          <p className="text-[clamp(0.5rem,1.6vw,0.625rem)] text-slate-400 dark:text-neutral-500">{listCount} liste</p>
        </div>
        <div className="shrink-0 text-right tabular-nums">
          <p className="font-semibold text-[clamp(0.6rem,2vw,0.8125rem)]">
            {coalition.votes.toLocaleString('it-IT')}
          </p>
          <p className="text-slate-500 dark:text-neutral-400 text-[clamp(0.5rem,1.6vw,0.625rem)]">
            {totalVoters > 0
              ? `${coalition.pctOnVoters.toFixed(1)}% su votanti`
              : totalListVotes > 0
                ? `${((coalition.votes / totalListVotes) * 100).toFixed(1)}% su voti lista scrutinati`
                : '—'}
          </p>
        </div>
      </div>
    )
  }
  if (!list) return null
  const pct = totalVoters > 0 ? list.pctOnVoters : list.percentOfListVotes
  return (
    <div className="flex-1 min-h-0 flex items-center gap-1.5 px-1.5 overflow-hidden">
      <ListLogo list={list} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-[clamp(0.55rem,1.9vw,0.75rem)] font-medium">{displayListLabel(list)}</p>
        <div className="h-0.5 sm:h-1 bg-slate-100 dark:bg-neutral-800 rounded-full mt-0.5 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, pct)}%`, backgroundColor: list.color }}
          />
        </div>
      </div>
      <div className="shrink-0 text-right tabular-nums leading-tight">
        <p className="font-semibold text-[clamp(0.6rem,2vw,0.8125rem)]">{list.votes.toLocaleString('it-IT')}</p>
        <p className="text-slate-500 dark:text-neutral-400 text-[clamp(0.5rem,1.6vw,0.625rem)]">
          {listPercentSubtitle(totalVoters, list.pctOnVoters, list.percentOfListVotes)}
        </p>
      </div>
    </div>
  )
}

function CoalitionHero({
  block,
  totalVoters,
  totalListVotes,
}: {
  block: PublicBoardCoalitionBlock
  totalVoters: number
  totalListVotes: number
}) {
  const coalitionPctOnLists =
    totalListVotes > 0 ? Math.min(100, (block.votes / totalListVotes) * 100) : 0
  const pctBar =
    totalVoters > 0 ? block.pctOnVoters : coalitionPctOnLists

  const coalitionPctLabel =
    totalVoters > 0
      ? `${block.pctOnVoters.toFixed(1)}% su votanti`
      : totalListVotes > 0
        ? `${coalitionPctOnLists.toFixed(1)}% su voti lista scrutinati`
        : '—'

  return (
    <div className="min-h-0 flex flex-col rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-700 p-1.5 sm:p-2 overflow-hidden">
      <div className="shrink-0 flex items-start gap-2 min-w-0 mb-1">
        {block.coalitionLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.coalitionLogoUrl}
            alt=""
            className="w-[clamp(2.5rem,12vw,4rem)] h-[clamp(2.5rem,12vw,4rem)] object-contain shrink-0"
          />
        ) : (
          <span
            className="w-[clamp(2.5rem,12vw,4rem)] h-[clamp(2.5rem,12vw,4rem)] rounded-lg shrink-0"
            style={{ backgroundColor: block.color }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold leading-tight truncate text-[clamp(0.75rem,3.2vw,1.125rem)]">{block.name}</p>
          {block.mayorLabel && (
            <p className="text-slate-500 dark:text-neutral-400 truncate text-[clamp(0.55rem,2vw,0.75rem)]">{block.mayorLabel}</p>
          )}
          <p className="tabular-nums font-bold text-[clamp(0.8rem,3.5vw,1.25rem)] mt-0.5">
            {block.votes.toLocaleString('it-IT')}
            <span className="font-normal text-slate-500 dark:text-neutral-400 text-[clamp(0.6rem,2.2vw,0.875rem)]">
              {' '}
              / {totalVoters > 0 ? totalVoters.toLocaleString('it-IT') : '—'}
            </span>
          </p>
          <p className="text-[clamp(0.6rem,2.2vw,0.875rem)] font-medium text-slate-600 dark:text-neutral-300">
            {coalitionPctLabel}
          </p>
        </div>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-full shrink-0 overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, pctBar)}%`, backgroundColor: block.color }}
        />
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-1 justify-end">
        {block.topLists.map(l => (
          <ListHero key={l.listId} list={l} totalVoters={totalVoters} nested />
        ))}
      </div>
    </div>
  )
}

function ListHero({
  list,
  totalVoters,
  nested = false,
}: {
  list: PublicBoardListItem
  totalVoters: number
  nested?: boolean
}) {
  const pct = totalVoters > 0 ? list.pctOnVoters : list.percentOfListVotes

  if (nested) {
    return (
      <div className="flex items-center gap-2 min-h-0 bg-white/80 dark:bg-neutral-900/90 rounded-md px-1.5 py-1 border border-slate-100 dark:border-neutral-700">
        <ListLogo list={list} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate text-[clamp(0.6rem,2.4vw,0.875rem)]">
            {displayListLabel(list)}
          </p>
          {list.candidateMayor && (
            <p className="text-slate-500 dark:text-neutral-400 truncate text-[clamp(0.5rem,1.8vw,0.6875rem)]">{list.candidateMayor}</p>
          )}
        </div>
        <div className="shrink-0 text-right tabular-nums">
          <p className="font-bold text-[clamp(0.65rem,2.5vw,0.9375rem)]">{list.votes.toLocaleString('it-IT')}</p>
          <p className="text-slate-500 dark:text-neutral-400 text-[clamp(0.5rem,1.8vw,0.6875rem)]">
            {listPercentSubtitle(totalVoters, list.pctOnVoters, list.percentOfListVotes)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-0 flex flex-col justify-center rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-700 p-2 sm:p-2.5 overflow-hidden">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <ListLogo list={list} size="lg" />
        {list.coalitionLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={list.coalitionLogoUrl}
            alt=""
            className="w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0 opacity-90"
          />
        ) : null}
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate text-[clamp(0.8rem,3.5vw,1.25rem)] leading-tight">
            {displayListLabel(list)}
          </p>
          {(list.candidateMayor || list.coalition) && (
            <p className="text-slate-500 dark:text-neutral-400 truncate text-[clamp(0.55rem,2vw,0.75rem)]">
              {list.candidateMayor}
              {list.candidateMayor && list.coalition ? ' · ' : ''}
              {list.coalition}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right tabular-nums">
          <p className="font-bold text-[clamp(0.85rem,3.8vw,1.375rem)]">
            {list.votes.toLocaleString('it-IT')}
            <span className="font-normal text-slate-500 dark:text-neutral-400 text-[clamp(0.55rem,2vw,0.75rem)] block sm:inline">
              {' '}
              / {totalVoters > 0 ? totalVoters.toLocaleString('it-IT') : '—'}
            </span>
          </p>
          <p className="font-medium text-slate-600 dark:text-neutral-300 text-[clamp(0.6rem,2.2vw,0.875rem)]">
            {listPercentSubtitle(totalVoters, list.pctOnVoters, list.percentOfListVotes)}
          </p>
        </div>
      </div>
      <div className="h-2 sm:h-2.5 bg-slate-200 dark:bg-neutral-800 rounded-full mt-2 overflow-hidden shrink-0">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: list.color }}
        />
      </div>
    </div>
  )
}

function ListLogo({
  list,
  size,
}: {
  list: PublicBoardListItem
  size: 'sm' | 'md' | 'lg'
}) {
  const cls =
    size === 'lg'
      ? 'w-[clamp(2.75rem,14vw,4.5rem)] h-[clamp(2.75rem,14vw,4.5rem)]'
      : size === 'md'
        ? 'w-8 h-8 sm:w-9 sm:h-9'
        : 'w-5 h-5 sm:w-6 sm:h-6'
  if (list.listLogoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={list.listLogoUrl}
        alt=""
        className={cn(cls, 'object-contain rounded-md shrink-0 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-700')}
      />
    )
  }
  return (
    <span
      className={cn(cls, 'rounded-md shrink-0 inline-block')}
      style={{ backgroundColor: list.color }}
      aria-hidden
    />
  )
}
