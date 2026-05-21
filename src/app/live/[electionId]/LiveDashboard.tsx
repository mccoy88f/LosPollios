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
import {
  BarChart3,
  Grid3X3,
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
}

function toggleId(prev: number | null, id: number): number | null {
  return prev === id ? null : id
}

function LiveDashboardInner({
  electionId,
  electionName,
  commune,
  historicalElections,
}: {
  electionId: number
  electionName: string
  commune: string
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

  useEffect(() => {
    fetchData()
    const evtSource = new EventSource(`/api/elections/${electionId}/stream`)
    evtSource.onmessage = () => fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => {
      evtSource.close()
      clearInterval(interval)
    }
  }, [electionId, fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-24">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-spin">⏳</div>
          <p>Caricamento risultati...</p>
        </div>
      </div>
    )
  }

  if (!data) return <div className="p-8 text-center text-red-500 flex-1">Elezione non trovata</div>

  const { lists, sectionStatus, dataQuality } = data
  const totalListVotes = lists.reduce((s, l) => s + l.votes, 0)
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
    totalListVotes,
    selectedListId,
    onSelectList: (id: number) => setSelectedListId(prev => toggleId(prev, id)),
  }

  const sectionSelect = (s: LiveSectionStatus) => setSelectedSectionId(prev => toggleId(prev, s.id))

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-4">
      <LiveKpiStrip data={data} lastPulse={lastPulse} hasWarnings={hasWarnings} />

      {showListRanking && (
        <LiveListRanking {...listRankingProps} limit={view === 'panorama' ? 6 : undefined} />
      )}

      <TabBar tabs={tabs} value={view} onChange={setView} className="w-full sm:w-auto" />

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
          <LiveListBarChart lists={lists} totalListVotes={totalListVotes} />
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
          historicalElections={historicalElections}
        />
      )}

      {view === 'preferenze' && hasPreferenze && (
        <LivePreferenzePanel
          lists={lists}
          electionId={electionId}
          selectedCandidateId={selectedCandidateId}
          onSelectCandidate={id => setSelectedCandidateId(prev => toggleId(prev, id))}
        />
      )}
    </div>
  )
}

export default function LiveDashboard(props: {
  electionId: number
  electionName: string
  commune: string
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
