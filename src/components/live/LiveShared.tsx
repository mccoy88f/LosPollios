'use client'

import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { formatNumber, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/cn'
import { Alert } from '@/components/ui/Alert'
import {
  SectionLiveProgressFill,
  SectionStatusBadge,
  sectionLiveCellClasses,
} from '@/components/ui/SectionStatusBadge'
import { Crown } from 'lucide-react'
import type { LiveListResult, LiveResultsData, LiveSectionStatus } from '@/components/live/liveTypes'
import {
  LiveCandidateSectionsPanel,
  LiveListPreferencesDetail,
  LiveSectionDetailPanel,
  liveSelectableRowClass,
} from '@/components/live/LiveDetailPanels'

export function LiveDataQualityAlert({ dataQuality }: { dataQuality: LiveResultsData['dataQuality'] }) {
  if (!dataQuality) return null
  const show =
    dataQuality.listVotesExceedRegisteredVoters || (dataQuality.sectionsWithDataWarnings ?? 0) > 0
  if (!show) return null

  return (
    <Alert variant="warning" title="Controllo coerenza dati">
      {dataQuality.listVotesExceedRegisteredVoters && (
        <p className="mb-2">
          La somma dei voti di lista supera i votanti reali registrati in affluenza: verificare le sezioni o
          l&apos;aggregato prima di usare le percentuali di scrutinio.
        </p>
      )}
      {(dataQuality.sectionsWithDataWarnings ?? 0) > 0 && (
        <p>
          {dataQuality.sectionsWithDataWarnings === 1
            ? 'Una sezione presenta incongruenze'
            : `${dataQuality.sectionsWithDataWarnings} sezioni presentano incongruenze`}{' '}
          (schede valide, voti lista o preferenze). Nella vista Sezioni le celle con anello ambra segnalano il
          problema.
        </p>
      )}
    </Alert>
  )
}

export function LiveTurnoutCards({
  turnout,
  totalListVotes,
}: {
  turnout: LiveResultsData['turnout']
  totalListVotes: number
}) {
  const items = [
    { label: 'Aventi diritto', value: formatNumber(turnout.totalTheoretical), sub: '' },
    { label: 'Votanti', value: formatNumber(turnout.totalActual), sub: formatPercent(turnout.percentage) },
    {
      label: 'Schede valide',
      value: formatNumber(turnout.totalValid),
      sub: turnout.totalActual > 0 ? formatPercent((turnout.totalValid / turnout.totalActual) * 100) : '—',
    },
    { label: 'Voti di lista', value: formatNumber(totalListVotes), sub: '' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">{s.label}</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
          {s.sub && <p className="text-sm text-brand-800 font-medium">{s.sub}</p>}
        </div>
      ))}
    </div>
  )
}

export function LiveListRanking({
  lists,
  totalListVotes,
  limit,
  showAllLink,
  onShowAll,
  selectedListId,
  onSelectList,
  hint,
}: {
  lists: LiveListResult[]
  totalListVotes: number
  limit?: number
  showAllLink?: boolean
  onShowAll?: () => void
  selectedListId?: number | null
  onSelectList?: (listId: number) => void
  hint?: string
}) {
  const sorted = [...lists].sort((a, b) => b.votes - a.votes)
  const shown = limit != null ? sorted.slice(0, limit) : sorted
  const selectedList = selectedListId != null ? lists.find(l => l.listId === selectedListId) : null

  if (!lists.length) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1 gap-2">
        <h3 className="font-semibold text-gray-900">Risultati liste</h3>
        {showAllLink && sorted.length > (limit ?? 0) && onShowAll && (
          <button type="button" onClick={onShowAll} className="text-sm text-brand-800 hover:underline font-medium">
            Vedi tutte →
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-500 mb-3">{hint}</p>}
      {!hint && onSelectList && (
        <p className="text-xs text-gray-500 mb-3">Clicca una lista per le preferenze aggregate</p>
      )}
      <div className="space-y-2">
        {shown.map(list => (
          <ListRow
            key={list.listId}
            list={list}
            pct={totalListVotes > 0 ? (list.votes / totalListVotes) * 100 : 0}
            selected={selectedListId === list.listId}
            onSelect={onSelectList ? () => onSelectList(list.listId) : undefined}
          />
        ))}
      </div>
      {selectedList && onSelectList && (
        <LiveListPreferencesDetail list={selectedList} onClose={() => onSelectList(selectedList.listId)} />
      )}
    </div>
  )
}

function ListRow({
  list,
  pct,
  selected,
  onSelect,
}: {
  list: LiveListResult
  pct: number
  selected?: boolean
  onSelect?: () => void
}) {
  const interactive = !!onSelect

  return (
    <div className={interactive ? liveSelectableRowClass(!!selected) : undefined}>
      <div
        className={cn(interactive && 'py-1')}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? onSelect : undefined}
        onKeyDown={
          interactive
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect?.()
                }
              }
            : undefined
        }
      >
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {list.listLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={list.listLogoUrl} alt="" className="w-8 h-8 object-contain rounded shrink-0 bg-white border border-gray-100" />
          ) : (
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
          )}
          {list.coalitionLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={list.coalitionLogoUrl} alt="" title="Coalizione" className="w-6 h-6 object-contain rounded shrink-0 opacity-90" />
          ) : null}
          <span className="font-medium text-sm text-gray-900 truncate">{list.listName}</span>
          {list.candidateMayor && <span className="text-xs text-gray-400 hidden sm:inline truncate">{list.candidateMayor}</span>}
          {list.coalition && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded hidden md:inline shrink-0">{list.coalition}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 tabular-nums">
          <span className="font-bold text-gray-900">{formatPercent(pct)}</span>
          <span className="text-sm text-gray-500 w-20 text-right">{formatNumber(list.votes)}</span>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: list.color }}
        />
      </div>
      </div>
    </div>
  )
}

export function LiveListBarChart({ lists, totalListVotes }: { lists: LiveListResult[]; totalListVotes: number }) {
  const chartData = lists
    .filter(l => l.votes > 0)
    .sort((a, b) => b.votes - a.votes)
    .map(l => ({
      name: l.shortName || l.listName.slice(0, 12),
      pct: totalListVotes > 0 ? (l.votes / totalListVotes) * 100 : 0,
      color: l.color,
    }))

  if (!chartData.length) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Confronto liste (%)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
          <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Percentuale']} />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Raggruppa solo per campo coalizione compilato */
export function LiveCoalitionByField({ lists }: { lists: LiveListResult[] }) {
  const coalitionMap = new Map<
    string,
    { votes: number; color: string; mayors: Set<string>; listCount: number }
  >()
  const total = lists.reduce((s, l) => s + l.votes, 0)

  for (const l of lists) {
    const key = l.coalition?.trim()
    if (!key) continue
    if (!coalitionMap.has(key)) {
      coalitionMap.set(key, { votes: 0, color: l.color, mayors: new Set(), listCount: 0 })
    }
    const row = coalitionMap.get(key)!
    row.votes += l.votes
    row.listCount += 1
    if (l.candidateMayor?.trim()) row.mayors.add(l.candidateMayor.trim())
  }

  const coalitions = Array.from(coalitionMap.entries())
    .map(([name, c]) => ({
      name,
      votes: c.votes,
      color: c.color,
      listCount: c.listCount,
      mayor: c.mayors.size === 1 ? [...c.mayors][0] : c.mayors.size > 1 ? 'Più candidati' : undefined,
      pct: total > 0 ? (c.votes / total) * 100 : 0,
    }))
    .sort((a, b) => b.votes - a.votes)

  if (!coalitions.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        Nessuna coalizione con voti registrati.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Coalizioni</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div>
          {coalitions.map((c, i) => (
            <div key={c.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {i === 0 && <Crown className="w-4 h-4 text-accent-500 shrink-0" aria-hidden />}
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <div className="min-w-0">
                  <div className="font-medium text-sm text-gray-900">{c.name}</div>
                  {c.mayor && <div className="text-xs text-gray-500">{c.mayor}</div>}
                  <div className="text-xs text-gray-400">{c.listCount} liste</div>
                </div>
              </div>
              <div className="text-right shrink-0 tabular-nums">
                <div className="font-bold text-gray-900">{formatPercent(c.pct)}</div>
                <div className="text-xs text-gray-500">{formatNumber(c.votes)}</div>
              </div>
            </div>
          ))}
        </div>
        {total > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={coalitions} dataKey="votes" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {coalitions.map((c, i) => (
                  <Cell key={i} fill={c.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${formatNumber(v)} voti`, '']} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export function LiveCoalitionMini({ lists }: { lists: LiveListResult[] }) {
  const coalitionMap = new Map<string, { votes: number; color: string }>()
  const total = lists.reduce((s, l) => s + l.votes, 0)

  for (const l of lists) {
    const key = l.coalition?.trim()
    if (!key) continue
    if (!coalitionMap.has(key)) coalitionMap.set(key, { votes: 0, color: l.color })
    coalitionMap.get(key)!.votes += l.votes
  }

  const top = Array.from(coalitionMap.entries())
    .map(([name, c]) => ({ name, ...c, pct: total > 0 ? (c.votes / total) * 100 : 0 }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 3)

  if (!top.length) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-3">Top coalizioni</h3>
      <div className="space-y-2">
        {top.map((c, i) => (
          <div key={c.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              {i === 0 && <Crown className="w-3.5 h-3.5 text-accent-500 shrink-0" aria-hidden />}
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <span className="font-medium truncate">{c.name}</span>
            </div>
            <span className="font-bold tabular-nums shrink-0">{formatPercent(c.pct)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LiveSectionGrid({
  sections,
  compact,
  electionId,
  selectedSectionId,
  onSelectSection,
}: {
  sections: LiveSectionStatus[]
  compact?: boolean
  electionId?: number
  selectedSectionId?: number | null
  onSelectSection?: (section: LiveSectionStatus) => void
}) {
  const counted = sections.filter(s => s.locked).length
  const selected = selectedSectionId != null ? sections.find(s => s.id === selectedSectionId) : null
  const clickable = !!electionId && !!onSelectSection

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-5">
        <div className="flex items-center justify-between mb-1 gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">Sezioni</h3>
          <span className="text-sm text-gray-500 dark:text-neutral-400 tabular-nums">
            {counted} / {sections.length} chiuse
          </span>
        </div>
        {clickable && (
          <p className="text-xs text-gray-500 dark:text-neutral-400 mb-3">Clicca una sezione per il resoconto</p>
        )}
        <div
          className={
            compact
              ? 'grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1'
              : 'grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5'
          }
        >
          {sections.map(s => {
            const hasWarning = (s.sectionWarnings?.length ?? 0) > 0
            const progress = {
              sectionNumber: s.number,
              locked: s.locked,
              hasTurnout: s.hasTurnout,
              hasResults: s.hasResults,
              hasWarning,
            }
            const warn = hasWarning ? s.sectionWarnings!.join('\n') : ''
            const pct = progress.hasResults || progress.locked ? 100 : progress.hasTurnout ? 50 : 0
            const titleBase = `Sezione ${s.number}${s.name ? ` – ${s.name}` : ''} · spoglio ${pct}%${s.votersActual != null ? `\n${s.votersActual} votanti` : ''}`
            const title = warn ? `${titleBase}\n\n${warn}` : titleBase
            const isSelected = selectedSectionId === s.id
            return (
              <button
                key={s.id}
                type="button"
                title={title}
                disabled={!clickable}
                onClick={clickable ? () => onSelectSection!(s) : undefined}
                className={cn(
                  sectionLiveCellClasses(progress),
                  clickable && 'cursor-pointer hover:ring-2 hover:ring-brand-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                  isSelected && 'ring-2 ring-brand-800 ring-offset-1'
                )}
              >
                <SectionLiveProgressFill {...progress} />
                <span className="relative z-10">{s.number}</span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          <SectionStatusBadge status="pending" />
          <SectionStatusBadge status="in_progress" />
          <SectionStatusBadge status="closed" />
          <span className="text-xs text-gray-500 dark:text-neutral-400 self-center">Anello ambra = da verificare</span>
        </div>
      </div>

      {selected && electionId && onSelectSection && (
        <LiveSectionDetailPanel
          electionId={electionId}
          sectionId={selected.id}
          sectionNumber={selected.number}
          onClose={() => onSelectSection(selected)}
        />
      )}
    </div>
  )
}

export interface SeatProjectionRow {
  listId: number
  listName: string
  color: string
  votes: number
  percentage: number
  seats: number
  aboveThreshold: boolean
}

export function LiveSeatProjection({
  seats,
  totalSeats,
  coverage,
  sectionsCounted,
  totalSections,
  electionId,
}: {
  seats: SeatProjectionRow[]
  totalSeats: number
  coverage: number
  sectionsCounted: number
  totalSections: number
  electionId: number
}) {
  const filtered = seats.filter(s => s.seats > 0)

  return (
    <div className="space-y-4">
      <Alert variant="info" title="Proiezione su dati parziali">
        Stima basata su <strong>{sectionsCounted}</strong> / {totalSections} sezioni con affluenza (
        {coverage.toFixed(1)}%). I seggi possono variare al completamento dello spoglio.
      </Alert>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-2">Distribuzione seggi (stima)</h3>
        <p className="text-sm text-gray-500 mb-4">Totale seggi: {totalSeats}</p>
        {filtered.length > 0 && (
          <div className="flex h-8 rounded-lg overflow-hidden mb-4">
            {filtered.map(s => (
              <div
                key={s.listId}
                title={`${s.listName}: ${s.seats} seggi`}
                className="transition-all duration-700 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${(s.seats / totalSeats) * 100}%`, backgroundColor: s.color }}
              >
                {s.seats >= 2 ? s.seats : ''}
              </div>
            ))}
          </div>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="pb-2">Lista</th>
              <th className="text-right pb-2">Voti %</th>
              <th className="text-right pb-2">Seggi</th>
              <th className="text-right pb-2">Soglia</th>
            </tr>
          </thead>
          <tbody>
            {[...seats].sort((a, b) => b.votes - a.votes).map(s => (
              <tr key={s.listId} className={`border-b border-gray-50 last:border-0 ${!s.aboveThreshold ? 'opacity-50' : ''}`}>
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className={s.aboveThreshold ? 'font-medium' : ''}>{s.listName}</span>
                  </div>
                </td>
                <td className="py-1.5 text-right tabular-nums">{formatPercent(s.percentage)}</td>
                <td className="py-1.5 text-right font-bold tabular-nums">{s.aboveThreshold ? s.seats : '—'}</td>
                <td className="py-1.5 text-right text-xs">
                  <span className={`px-1.5 py-0.5 rounded ${s.aboveThreshold ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {s.aboveThreshold ? '✓' : '✗'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-sm">
        <Link href={`/live/${electionId}?view=analisi`} className="text-brand-800 hover:underline font-medium">
          Analisi completa e confronto storico →
        </Link>
      </p>
    </div>
  )
}

export function LivePreferenzePanel({
  lists,
  electionId,
  compact,
  selectedCandidateId,
  onSelectCandidate,
}: {
  lists: LiveListResult[]
  electionId: number
  compact?: boolean
  selectedCandidateId?: number | null
  onSelectCandidate?: (candidateId: number) => void
}) {
  const withCandidates = lists.filter(l => l.candidates.length > 0)
  if (!withCandidates.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        Nessun candidato configurato sulle liste.
      </div>
    )
  }

  const globalTop = withCandidates
    .flatMap(l =>
      l.candidates.map(c => ({
        ...c,
        listName: l.listName,
        color: l.color,
        listVotes: l.votes,
      }))
    )
    .sort((a, b) => b.votes - a.votes)
    .slice(0, compact ? 10 : 20)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-gray-900">
            {compact ? 'Top preferenze' : 'Preferenze candidati (aggregate)'}
          </h3>
          <Link href={`/live/${electionId}/preferenze`} className="text-sm text-brand-800 hover:underline font-medium">
            Dettaglio e grafici →
          </Link>
        </div>

        {!compact && (
          <p className="text-xs text-gray-500 mb-4">
            Dati aggregati da tutte le sezioni inserite. Clicca un candidato per il dettaglio per sezione.
          </p>
        )}
        {compact && onSelectCandidate && (
          <p className="text-xs text-gray-500 mb-3">Clicca un candidato per il dettaglio per sezione</p>
        )}

        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Top {globalTop.length} candidati
          </h4>
          <div className="space-y-1">
            {globalTop.map((c, i) => {
              const pct = c.listVotes > 0 ? (c.votes / c.listVotes) * 100 : 0
              const clickable = !!onSelectCandidate
              const selected = selectedCandidateId === c.candidateId
              return (
                <div key={c.candidateId}>
                  <div
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={clickable ? () => onSelectCandidate!(c.candidateId) : undefined}
                    onKeyDown={
                      clickable
                        ? e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onSelectCandidate!(c.candidateId)
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      'flex items-center justify-between gap-2 text-sm rounded-lg px-3 py-2',
                      clickable && liveSelectableRowClass(selected),
                      !clickable && 'bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-400 w-5 tabular-nums">{i + 1}.</span>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-gray-900 truncate">
                        <strong>{c.name}</strong>
                        <span className="text-gray-500 font-normal"> · {c.listName}</span>
                      </span>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                      <span className="font-semibold text-gray-900 ml-2">{formatNumber(c.votes)}</span>
                    </div>
                  </div>
                  {selected && onSelectCandidate && (
                    <LiveCandidateSectionsPanel
                      electionId={electionId}
                      candidateId={c.candidateId}
                      candidateName={c.name}
                      onClose={() => onSelectCandidate(c.candidateId)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {!compact && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...withCandidates].sort((a, b) => b.votes - a.votes).map(list => {
              const prefTotal = list.candidates.reduce((s, c) => s + c.votes, 0)
              return (
                <div key={list.listId}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                    <h4 className="text-sm font-semibold text-gray-700">{list.listName}</h4>
                    <span className="text-xs text-gray-400">Σ {formatNumber(prefTotal)}</span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {[...list.candidates]
                      .sort((a, b) => b.votes - a.votes)
                      .slice(0, 5)
                      .map(c => {
                        const pctList = list.votes > 0 ? (c.votes / list.votes) * 100 : 0
                        const clickable = !!onSelectCandidate
                        const selected = selectedCandidateId === c.candidateId
                        return (
                          <div key={c.candidateId}>
                            <div
                              role={clickable ? 'button' : undefined}
                              tabIndex={clickable ? 0 : undefined}
                              onClick={clickable ? () => onSelectCandidate!(c.candidateId) : undefined}
                              onKeyDown={
                                clickable
                                  ? e => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        onSelectCandidate!(c.candidateId)
                                      }
                                    }
                                  : undefined
                              }
                              className={cn(
                                'flex items-center justify-between text-sm rounded px-3 py-1.5 gap-2',
                                clickable && liveSelectableRowClass(selected),
                                !clickable && 'bg-gray-50'
                              )}
                            >
                              <span className="text-gray-700 truncate">{c.name}</span>
                              <span className="shrink-0 font-semibold tabular-nums">{formatNumber(c.votes)}</span>
                              <span className="shrink-0 text-xs text-gray-500 w-12 text-right">{pctList.toFixed(1)}%</span>
                            </div>
                            {selected && onSelectCandidate && (
                              <LiveCandidateSectionsPanel
                                electionId={electionId}
                                candidateId={c.candidateId}
                                candidateName={c.name}
                                onClose={() => onSelectCandidate(c.candidateId)}
                              />
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
