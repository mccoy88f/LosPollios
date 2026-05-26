'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PublicBoardListsPanel } from '@/components/public/PublicBoardListsPanel'
import { SiteCredits } from '@/components/SiteCredits'
import type { PublicBoardPayload } from '@/lib/publicBoard'
import { getPublicBoardClientId } from '@/lib/publicBoardClientId'
import { getSectionFillColor } from '@/lib/sectionColors'
import type { SectionUiStatus } from '@/lib/sectionStatus'
import { Users } from 'lucide-react'

const PRESENCE_INTERVAL_MS = 30_000

export default function PublicBoardClient({ token }: { token: string }) {
  const [data, setData] = useState<PublicBoardPayload | null>(null)
  const [refreshSeconds, setRefreshSeconds] = useState(60)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const clientIdRef = useRef('')

  const sendPresence = useCallback(async () => {
    const clientId = clientIdRef.current || getPublicBoardClientId()
    clientIdRef.current = clientId
    if (!clientId) return
    try {
      const res = await fetch(`/api/public/board/${encodeURIComponent(token)}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
        keepalive: true,
      })
      if (res.ok) {
        const d = await res.json()
        if (typeof d.activeViewers === 'number') {
          setData(prev => (prev ? { ...prev, activeViewers: d.activeViewers } : prev))
        }
      }
    } catch {
      /* presenza best-effort */
    }
  }, [token])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/board/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        setError(res.status === 404 ? 'Tabellone non attivo o link non valido.' : 'Errore di caricamento.')
        setData(null)
        return
      }
      const json = (await res.json()) as PublicBoardPayload
      setData(json)
      setRefreshSeconds(json.refreshSeconds)
      setError('')
    } catch {
      setError('Connessione non disponibile. Riprovo al prossimo aggiornamento.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    clientIdRef.current = getPublicBoardClientId()
    void sendPresence()
    void load()
    const presenceId = setInterval(() => void sendPresence(), PRESENCE_INTERVAL_MS)
    const ms = Math.max(15, refreshSeconds) * 1000
    const dataId = setInterval(() => void load(), ms)
    return () => {
      clearInterval(presenceId)
      clearInterval(dataId)
    }
  }, [load, sendPresence, refreshSeconds])

  if (loading && !data) {
    return (
      <div className="h-full w-full flex items-center justify-center text-slate-500 text-sm">
        Caricamento…
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <p className="text-center text-slate-600 text-sm max-w-md">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const { election, progress, lists, sections, hasCoalitions } = data
  const updatedLabel = new Date(data.updatedAt).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const statCards = [
    { label: 'Affluenza', value: `${progress.turnoutPercent.toFixed(1)}%`, sub: progress.totalActualVoters },
    { label: 'Scrutinio', value: `${progress.scrutinizedPercent.toFixed(1)}%`, sub: progress.totalListVotes },
    {
      label: 'Sez. votanti',
      value: `${progress.sectionsWithTurnout}/${progress.totalSections}`,
      sub: null as number | null,
    },
    {
      label: 'Sez. con voti',
      value: `${progress.sectionsWithVotes}/${progress.totalSections}`,
      sub: null as number | null,
    },
  ]

  return (
    <div className="h-full w-full flex flex-col text-slate-900 overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <h1 className="font-bold truncate text-[clamp(0.875rem,3.5vw,1.25rem)] leading-tight">
              {election.name}
            </h1>
            <p className="text-slate-500 truncate text-[clamp(0.65rem,2.5vw,0.8125rem)]">{election.commune}</p>
          </div>
          <div className="shrink-0 text-right text-[clamp(0.55rem,2vw,0.6875rem)] text-slate-400 tabular-nums leading-snug">
            <p className="inline-flex items-center justify-end gap-1 font-medium text-slate-500">
              <Users className="w-3 h-3 shrink-0" aria-hidden />
              {data.activeViewers === 1 ? '1 collegato' : `${data.activeViewers} collegati`}
            </p>
            <p>
              ogni {refreshSeconds}s · {updatedLabel}
              {error ? ' · ⚠' : ''}
            </p>
          </div>
        </div>
      </header>

      <div className="shrink-0 grid grid-cols-4 gap-1.5 sm:gap-2 p-2 sm:p-3 pb-1.5">
        {statCards.map(c => (
          <div
            key={c.label}
            className="bg-white rounded-lg border border-slate-200 px-2 py-1.5 sm:px-2.5 sm:py-2 flex flex-col justify-center min-w-0"
          >
            <p className="text-[clamp(0.5rem,1.8vw,0.625rem)] text-slate-500 uppercase tracking-wide truncate">
              {c.label}
            </p>
            <p className="font-bold tabular-nums text-[clamp(0.75rem,3vw,1.125rem)] leading-none mt-0.5 truncate">
              {c.value}
            </p>
            {c.sub != null && (
              <p className="text-[clamp(0.5rem,1.6vw,0.625rem)] text-slate-400 tabular-nums truncate">
                {c.sub.toLocaleString('it-IT')}
              </p>
            )}
          </div>
        ))}
      </div>

      <main className="flex-1 min-h-0 grid grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1 gap-2 px-2 sm:px-3 pb-2 sm:pb-3 overflow-hidden">
        <section className="min-h-0 flex flex-col overflow-hidden bg-white rounded-lg border border-slate-200">
          <h2 className="shrink-0 px-2 py-1 text-[clamp(0.55rem,2vw,0.6875rem)] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
            {hasCoalitions ? 'Coalizioni e liste' : 'Voti di lista'}
          </h2>
          <PublicBoardListsPanel lists={lists} totalVoters={progress.totalActualVoters} />
        </section>

        <section className="min-h-0 flex flex-col overflow-hidden bg-white rounded-lg border border-slate-200">
          <h2 className="shrink-0 px-2 py-1 text-[clamp(0.55rem,2vw,0.6875rem)] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
            Stato sezioni
          </h2>
          <div
            className="flex-1 min-h-0 grid gap-1 p-1.5 sm:p-2 overflow-hidden"
            style={{
              gridTemplateColumns: `repeat(${sectionGridCols(sections.length)}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${sectionGridRows(sections.length)}, minmax(0, 1fr))`,
            }}
          >
            {sections.map(s => (
              <SectionTile key={s.number} section={s} />
            ))}
          </div>
        </section>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white/90 px-2 py-1">
        <SiteCredits variant="compact" />
      </footer>
    </div>
  )
}

/** Colonne griglia sezioni in base al conteggio e allo spazio disponibile */
function sectionGridCols(count: number): number {
  if (count <= 0) return 1
  if (count <= 4) return Math.min(count, 2)
  if (count <= 12) return 3
  if (count <= 20) return 4
  if (count <= 35) return 5
  if (count <= 50) return 6
  return 7
}

function sectionGridRows(count: number): number {
  const cols = sectionGridCols(count)
  return Math.max(1, Math.ceil(count / cols))
}

function SectionTile({ section }: { section: PublicBoardPayload['sections'][number] }) {
  const status = section.status as SectionUiStatus
  const fill = getSectionFillColor(section.number)
  const pct = section.scrutinyPercent
  const hasVoters = section.votersActual != null && section.votersActual > 0

  return (
    <div
      className={`relative rounded border overflow-hidden flex flex-col justify-center items-center text-center min-h-0 min-w-0 p-0.5 ${
        section.locked ? 'border-dashed border-slate-300' : 'border-slate-200'
      }`}
      title={
        hasVoters
          ? `Sez. ${section.number}: ${section.listVotesSum} / ${section.votersActual} voti`
          : `Sez. ${section.number}`
      }
    >
      <div
        className="absolute inset-y-0 left-0 transition-all duration-500 opacity-25"
        style={{ width: `${pct}%`, backgroundColor: fill }}
        aria-hidden
      />
      <div className="relative w-full min-w-0 px-0.5">
        <p className="font-bold tabular-nums text-[clamp(0.55rem,2.2vw,0.75rem)] leading-none">
          {section.number}
        </p>
        {hasVoters && (
          <p className="tabular-nums text-[clamp(0.45rem,1.6vw,0.625rem)] text-slate-600 leading-tight mt-0.5 truncate w-full">
            {section.listVotesSum}/{section.votersActual}
          </p>
        )}
        {hasVoters && pct > 0 && (
          <p className="tabular-nums text-[clamp(0.4rem,1.4vw,0.5625rem)] text-slate-400 leading-none">
            {pct}%
          </p>
        )}
        {status === 'closed' && (
          <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500" aria-label="Chiusa" />
        )}
      </div>
    </div>
  )
}
