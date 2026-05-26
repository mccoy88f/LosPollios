'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { TabBar } from '@/components/ui/TabBar'
import { LiveKpiStrip } from '@/components/live/LiveKpiStrip'
import AnalysisPanel, { type HistElection } from '@/components/live/AnalysisPanel'
import {
  LiveCoalitionByField,
  LiveCoalitionMini,
  LiveDataQualityAlert,
  LiveListBarChart,
  LiveListRanking,
  LivePreferenzePanel,
  LiveSectionGrid,
  LiveTurnoutCards,
} from '@/components/live/LiveShared'
import type { LiveResultsData, LiveSectionStatus } from '@/components/live/liveTypes'
import { electionHasCoalitions, normalizeLiveViewParam, type LiveViewId } from '@/lib/liveElection'
import LiveAggiornamentiPage from '@/app/live/[electionId]/aggiornamenti/LiveAggiornamentiPage'
import LivePreferenzePage from '@/app/live/[electionId]/preferenze/LivePreferenzePage'
import { LiveStreamStatusBanner } from '@/components/live/LiveStreamStatusBanner'
import { useElectionStream } from '@/hooks/useElectionStream'
import { LIVE_REFRESH_MS } from '@/lib/liveRefresh'
import { cn } from '@/lib/cn'
import {
  BarChart3,
  Grid3X3,
  History,
  LayoutDashboard,
  List,
  PieChart,
  Users,
} from 'lucide-react'

const VIEW_LABELS: Record<LiveViewId, string> = {
  panorama: 'Panoramica',
  liste: 'Liste',
  sezioni: 'Sezioni',
  coalizioni: 'Coalizioni',
  analisi: 'Analisi',
  preferenze: 'Preferenze',
  aggiornamenti: 'Aggiornamenti',
}

function toggleId(prev: number | null, id: number): number | null {
  return prev === id ? null : id
}

function LiveDashboardInner({
  electionId,
  electionName,
  commune,
  electionYear,
  historicalElections,
}: {
  electionId: number
  electionName: string
  commune: string
  electionYear: number
  historicalElections: HistElection[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [data, setData] = useState<LiveResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastPulse, setLastPulse] = useState<Date | null>(null)
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null)

  const hasCoalitions = data ? electionHasCoalitions(data.lists) : false
  const hasPreferenze = data ? data.lists.some(l => l.candidates.length > 0) : false

  const availableViews = useMemo((): LiveViewId[] => {
    const base: LiveViewId[] = ['panorama', 'liste', 'sezioni']
    if (hasCoalitions) base.push('coalizioni')
    if (hasPreferenze) base.push('preferenze')
    base.push('analisi')
    return base
  }, [hasCoalitions, hasPreferenze])

  const viewParam = searchParams.get('view')
  const view: LiveViewId = useMemo(() => {
    if (viewParam === 'aggiornamenti') return 'aggiornamenti'
    const normalized = normalizeLiveViewParam(viewParam)
    if (normalized && availableViews.includes(normalized)) return normalized
    return 'panorama'
  }, [viewParam, availableViews])

  const setView = useCallback(
    (id: LiveViewId) => {
      setSelectedListId(null)
      setSelectedSectionId(null)
      setSelectedCandidateId(null)
      const params = new URLSearchParams(searchParams.toString())
      if (id === 'panorama') params.delete('view')
      else params.set('view', id)
      const q = params.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  /** Rimuove ?view=coalizioni (o altro) se non applicabile a questa elezione */
  useEffect(() => {
    if (!data || viewParam === 'aggiornamenti' || viewParam == null) return
    const normalized = normalizeLiveViewParam(viewParam)
    if (normalized && !availableViews.includes(normalized)) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('view')
      const q = params.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    }
  }, [data, viewParam, availableViews, router, pathname, searchParams])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/elections/${electionId}/results`)
      if (res.ok) {
        setData(await res.json())
        setLastPulse(new Date())
      }
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [electionId])

  const streamStatus = useElectionStream(electionId, fetchData)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, LIVE_REFRESH_MS)
    return () => clearInterval(interval)
  }, [electionId, fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <div className="text-center text-gray-400 dark:text-neutral-500">
          <div className="text-4xl mb-3 animate-spin">⏳</div>
          <p>Caricamento risultati...</p>
        </div>
      </div>
    )
  }

  if (!data) return <div className="p-8 text-center text-red-500 flex-1">Elezione non trovata</div>

  const { lists, sectionStatus, dataQuality, turnout } = data
  const totalListVotes = lists.reduce((s, l) => s + l.votes, 0)
  const totalVoters = turnout.totalActual
  const hasWarnings =
    !!dataQuality?.listVotesExceedRegisteredVoters || (dataQuality?.sectionsWithDataWarnings ?? 0) > 0

  const showListRanking = lists.length > 0 && view !== 'liste'

  const tabs = availableViews.map(id => ({
    id,
    label: VIEW_LABELS[id],
    icon:
      id === 'panorama'
        ? LayoutDashboard
        : id === 'liste'
          ? List
          : id === 'sezioni'
            ? Grid3X3
            : id === 'coalizioni'
              ? PieChart
              : id === 'analisi'
                ? BarChart3
                : Users,
  }))

  const listRankingProps = {
    lists,
    totalVoters,
    selectedListId,
    onSelectList: (id: number) => setSelectedListId(prev => toggleId(prev, id)),
  }

  const sectionSelect = (s: LiveSectionStatus) => setSelectedSectionId(prev => toggleId(prev, s.id))

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-4">
      <LiveStreamStatusBanner status={streamStatus} />
      <LiveKpiStrip data={data} lastPulse={lastPulse} hasWarnings={hasWarnings} />

      {showListRanking && (
        <LiveListRanking
          {...listRankingProps}
          limit={view === 'panorama' ? 6 : undefined}
          emphasized={view === 'panorama'}
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <TabBar
          tabs={tabs}
          value={view === 'aggiornamenti' ? 'panorama' : view}
          activeId={view === 'aggiornamenti' ? null : view}
          onChange={setView}
          className="w-full sm:w-auto min-w-0"
        />
        <button
          type="button"
          role="tab"
          aria-selected={view === 'aggiornamenti'}
          onClick={() => setView('aggiornamenti')}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0',
            'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
            view === 'aggiornamenti'
              ? 'bg-brand-800 text-white border-brand-800'
              : 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-200 border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800'
          )}
        >
          <History className="w-4 h-4 shrink-0" aria-hidden />
          Aggiornamenti
        </button>
      </div>

      {view === 'panorama' && (
        <div className="space-y-6">
          <LiveDataQualityAlert dataQuality={dataQuality} />
          <LiveTurnoutCards turnout={data.turnout} totalListVotes={totalListVotes} />
          {hasCoalitions && <LiveCoalitionMini lists={lists} />}
          <LiveSectionGrid
            sections={sectionStatus}
            compact
            electionId={electionId}
            selectedSectionId={selectedSectionId}
            onSelectSection={sectionSelect}
          />
          {hasPreferenze && (
            <LivePreferenzePanel
              lists={lists}
              electionId={electionId}
              compact
              selectedCandidateId={selectedCandidateId}
              onSelectCandidate={id => setSelectedCandidateId(prev => toggleId(prev, id))}
            />
          )}
        </div>
      )}

      {view === 'liste' && (
        <div className="space-y-6">
          <LiveDataQualityAlert dataQuality={dataQuality} />
          <LiveListRanking {...listRankingProps} />
          <LiveListBarChart lists={lists} totalVoters={totalVoters} />
        </div>
      )}

      {view === 'sezioni' && (
        <div className="space-y-6">
          <LiveDataQualityAlert dataQuality={dataQuality} />
          <LiveSectionGrid
            sections={sectionStatus}
            electionId={electionId}
            selectedSectionId={selectedSectionId}
            onSelectSection={sectionSelect}
          />
        </div>
      )}

      {view === 'coalizioni' && hasCoalitions && (
        <div className="space-y-6">
          <LiveCoalitionByField lists={lists} />
        </div>
      )}

      {view === 'analisi' && (
        <AnalysisPanel
          embedded
          electionId={electionId}
          electionName={electionName}
          commune={commune}
          electionYear={electionYear}
          historicalElections={historicalElections}
          hasCoalitions={hasCoalitions}
        />
      )}

      {view === 'preferenze' && hasPreferenze && (
        <LivePreferenzePage
          embedded
          electionId={electionId}
          electionName={electionName}
          commune={commune}
        />
      )}

      {view === 'aggiornamenti' && (
        <LiveAggiornamentiPage
          embedded
          electionId={electionId}
          electionName={electionName}
          commune={commune}
        />
      )}
    </div>
  )
}

export default function LiveDashboard(props: {
  electionId: number
  electionName: string
  commune: string
  electionYear: number
  historicalElections: HistElection[]
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center flex-1 py-24 text-gray-400">Caricamento...</div>
      }
    >
      <LiveDashboardInner {...props} />
    </Suspense>
  )
}
