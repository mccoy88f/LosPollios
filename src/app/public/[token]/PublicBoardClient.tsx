'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PublicBoardListsPanel } from '@/components/public/PublicBoardListsPanel'
import { SiteCredits } from '@/components/SiteCredits'
import type { PublicBoardPayload } from '@/lib/publicBoard'
import { getPublicBoardClientId } from '@/lib/publicBoardClientId'
import { sectionScrutinyRatioLabel } from '@/lib/sectionScrutiny'
import {
  SectionLiveProgressFill,
  SectionProgressMetrics,
  sectionLiveCellClasses,
  type SectionProgressInput,
} from '@/components/ui/SectionStatusBadge'
import { cn } from '@/lib/cn'
import { AlertTriangle, Users } from 'lucide-react'

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

  const statCards: { label: string; value: string; sub?: string | null }[] = [
    {
      label: 'Affluenza',
      value: `${progress.turnoutPercent.toFixed(1)}%`,
      sub: `${progress.totalActualVoters.toLocaleString('it-IT')} votanti su ${progress.totalTheoreticalVoters.toLocaleString('it-IT')} iscritti`,
    },
    {
      label: 'Scrutinio',
      value: `${progress.scrutinizedPercent.toFixed(1)}%`,
      sub: `${progress.totalListVotes.toLocaleString('it-IT')} voti di lista scrutinati`,
    },
    {
      label: 'Votanti',
      value: progress.totalActualVoters.toLocaleString('it-IT'),
      sub: `su ${progress.totalTheoreticalVoters.toLocaleString('it-IT')} iscritti (aventi diritto)`,
    },
    {
      label: 'Sezioni',
      value: `${progress.sectionsWithVotes}/${progress.totalSections}`,
      sub: `${progress.sectionsWithTurnout}/${progress.totalSections} con dati affluenza`,
    },
  ]

  return (
    <div className="h-full w-full flex flex-col text-slate-900 dark:text-slate-100 overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <h1 className="font-bold truncate text-[clamp(0.875rem,3.5vw,1.25rem)] leading-tight">
              {election.name}
            </h1>
            <p className="text-slate-500 dark:text-neutral-400 truncate text-[clamp(0.65rem,2.5vw,0.8125rem)]">{election.commune}</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-0.5 text-right text-[clamp(0.55rem,2vw,0.6875rem)] text-slate-400 dark:text-neutral-500 tabular-nums leading-snug">
            <p className="flex items-center justify-end gap-1 font-medium text-slate-500 dark:text-neutral-300">
              <Users className="w-3 h-3 shrink-0" aria-hidden />
              {data.activeViewers === 1 ? '1 collegato' : `${data.activeViewers} collegati`}
            </p>
            <p className="flex items-center justify-end gap-1">
              <span>
                ogni {refreshSeconds}s · {updatedLabel}
              </span>
              {error ? (
                <span className="flex items-center gap-0.5 text-amber-700 dark:text-amber-500" title={error}>
                  <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                  <span className="sr-only">Errore ultimo aggiornamento</span>
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </header>

      <div className="shrink-0 grid grid-cols-4 gap-1.5 sm:gap-2 p-2 sm:p-3 pb-1.5">
        {statCards.map(c => (
          <div
            key={c.label}
            className="bg-white dark:bg-neutral-900 rounded-lg border border-slate-200 dark:border-neutral-700 px-2 py-1.5 sm:px-2.5 sm:py-2 flex flex-col justify-center min-w-0"
          >
            <p className="text-[clamp(0.5rem,1.8vw,0.625rem)] text-slate-500 dark:text-neutral-400 uppercase tracking-wide truncate">
              {c.label}
            </p>
            <p className="font-bold tabular-nums text-[clamp(0.75rem,3vw,1.125rem)] leading-none mt-0.5 truncate">
              {c.value}
            </p>
            {c.sub != null && c.sub !== '' && (
              <p className="text-[clamp(0.5rem,1.6vw,0.625rem)] text-slate-400 dark:text-neutral-500 tabular-nums leading-snug mt-0.5 line-clamp-2">
                {c.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      <main className="flex-1 min-h-0 grid grid-cols-1 grid-rows-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:grid-cols-5 lg:grid-rows-1 gap-2 px-2 sm:px-3 pb-2 sm:pb-3 overflow-hidden">
        <section className="min-h-0 flex flex-col overflow-hidden bg-white dark:bg-neutral-900 rounded-lg border border-slate-200 dark:border-neutral-700 lg:col-span-3">
          <h2 className="shrink-0 px-2 py-1 text-[clamp(0.55rem,2vw,0.6875rem)] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide border-b border-slate-100 dark:border-neutral-700">
            {hasCoalitions ? 'Coalizioni e liste' : 'Voti di lista'}
          </h2>
          <PublicBoardListsPanel lists={lists} totalVoters={progress.totalActualVoters} />
        </section>

        <section className="min-h-0 flex flex-col overflow-hidden bg-white dark:bg-neutral-900 rounded-lg border border-slate-200 dark:border-neutral-700 lg:col-span-2">
          <div className="shrink-0 px-2 py-1 border-b border-slate-100 dark:border-neutral-700 flex items-baseline justify-between gap-2">
            <h2 className="text-[clamp(0.55rem,2vw,0.6875rem)] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wide">
              Stato sezioni
            </h2>
            <span className="text-[clamp(0.5rem,1.8vw,0.625rem)] text-slate-400 dark:text-neutral-500 tabular-nums shrink-0">
              {sections.length} sez.
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-1.5 sm:p-2">
            <div className={publicBoardSectionGridClass(sections.length)}>
              {sections.map(s => (
                <PublicSectionTile key={s.number} section={s} />
              ))}
            </div>
          </div>
          <p className="shrink-0 px-2 py-1 text-[clamp(0.45rem,1.6vw,0.5625rem)] text-slate-400 dark:text-neutral-500 border-t border-slate-100 dark:border-neutral-800">
            Tratteggio = scrutinio terminato
          </p>
        </section>
      </main>

      <footer className="shrink-0 border-t border-slate-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900 px-2 py-1">
        <SiteCredits variant="compact" />
      </footer>
    </div>
  )
}

/** Griglia come live (compact): celle quadrate, scroll verticale se molte sezioni */
function publicBoardSectionGridClass(count: number): string {
  const base = 'grid gap-1.5 sm:gap-2 auto-rows-max w-full'
  if (count <= 12) return cn(base, 'grid-cols-4 sm:grid-cols-5')
  if (count <= 24) return cn(base, 'grid-cols-5 sm:grid-cols-6')
  return cn(base, 'grid-cols-5 sm:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8')
}

function PublicSectionTile({ section }: { section: PublicBoardPayload['sections'][number] }) {
  const progress: SectionProgressInput = {
    sectionNumber: section.number,
    locked: section.locked,
    votersActual: section.votersActual,
    listVotesSum: section.listVotesSum,
  }
  const { ratio, percent } = sectionScrutinyRatioLabel(section.listVotesSum, section.votersActual)
  const title = `Sezione ${section.number}${section.name ? ` – ${section.name}` : ''} · ${ratio} · ${percent}${
    section.locked ? ' · terminata' : ''
  }`

  return (
    <div className={sectionLiveCellClasses(progress)} title={title}>
      <SectionLiveProgressFill {...progress} />
      <div className="relative z-10 flex flex-col items-center justify-between flex-1 min-h-0 w-full py-0.5">
        <span className="font-bold leading-none shrink-0 text-[10px] sm:text-[11px] tabular-nums">
          {section.number}
        </span>
        <SectionProgressMetrics input={progress} compact variant="live" />
      </div>
    </div>
  )
}
