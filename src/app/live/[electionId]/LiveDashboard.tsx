'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { TabBar } from '@/components/ui/TabBar'
import { LiveKpiStrip } from '@/components/live/LiveKpiStrip'
import {
  LiveCoalitionByField,
  LiveCoalitionMini,
  LiveDataQualityAlert,
  LiveListBarChart,
  LiveListRanking,
  LivePreferenzePanel,
  LiveSeatProjection,
  LiveSectionGrid,
  LiveTurnoutCards,
  type SeatProjectionRow,
} from '@/components/live/LiveShared'
import type { LiveResultsData } from '@/components/live/liveTypes'
import { electionHasCoalitions, isLiveViewId, type LiveViewId } from '@/lib/liveElection'
import {
  BarChart3,
  Grid3X3,
  LayoutDashboard,
  List,
  PieChart,
  Users,
} from 'lucide-react'

interface ProjectionPayload {
  totalSections: number
  sectionsCounted: number
  coverage: number
  totalSeats: number
  current: {
    seats: SeatProjectionRow[]
  }
}

const VIEW_LABELS: Record<LiveViewId, string> = {
  panorama: 'Panoramica',
  liste: 'Liste',
  sezioni: 'Sezioni',
  coalizioni: 'Coalizioni',
  seggi: 'Seggi',
  preferenze: 'Preferenze',
}

function LiveDashboardInner({
  electionId,
  electionName,
  commune,
}: {
  electionId: number
  electionName: string
  commune: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [data, setData] = useState<LiveResultsData | null>(null)
  const [proj, setProj] = useState<ProjectionPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [projLoading, setProjLoading] = useState(false)
  const [lastPulse, setLastPulse] = useState<Date | null>(null)

  const hasCoalitions = data ? electionHasCoalitions(data.lists) : false
  const hasPreferenze = data ? data.lists.some(l => l.candidates.length > 0) : false

  const availableViews = useMemo((): LiveViewId[] => {
    const base: LiveViewId[] = ['panorama', 'liste', 'sezioni']
    if (hasCoalitions) base.push('coalizioni')
    base.push('seggi')
    if (hasPreferenze) base.push('preferenze')
    return base
  }, [hasCoalitions, hasPreferenze])

  const [view, setView] = useState<LiveViewId>('panorama')

  useEffect(() => {
    const urlView = searchParams.get('view')
    if (isLiveViewId(urlView) && availableViews.includes(urlView)) {
      setView(urlView)
      return
    }
    if (!availableViews.includes(view)) {
      setView('panorama')
    }
  }, [searchParams, availableViews, view])

  const setViewAndUrl = useCallback(
    (id: LiveViewId) => {
      setView(id)
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

  const fetchProjections = useCallback(async () => {
    setProjLoading(true)
    try {
      const res = await fetch(`/api/elections/${electionId}/projections`)
      if (res.ok) setProj(await res.json())
    } catch {
      /* ignore */
    }
    setProjLoading(false)
  }, [electionId])

  useEffect(() => {
    fetchData()
    const evtSource = new EventSource(`/api/elections/${electionId}/stream`)
    evtSource.onmessage = () => {
      fetchData()
      if (view === 'seggi') fetchProjections()
    }
    const interval = setInterval(fetchData, 30000)
    return () => {
      evtSource.close()
      clearInterval(interval)
    }
  }, [electionId, fetchData, fetchProjections, view])

  useEffect(() => {
    if (view === 'seggi' && !proj && !projLoading) fetchProjections()
  }, [view, proj, projLoading, fetchProjections])

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
              : id === 'seggi'
                ? BarChart3
                : Users,
  }))

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-4">
      <LiveKpiStrip
        electionName={electionName}
        commune={commune}
        data={data}
        lastPulse={lastPulse}
        electionId={electionId}
        hasWarnings={hasWarnings}
      />

      <TabBar tabs={tabs} value={view} onChange={setViewAndUrl} className="w-full sm:w-auto" />

      {view === 'panorama' && (
        <div className="space-y-6">
          <LiveDataQualityAlert dataQuality={dataQuality} />
          <LiveTurnoutCards turnout={data.turnout} totalListVotes={totalListVotes} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LiveListRanking
              lists={lists}
              totalListVotes={totalListVotes}
              limit={3}
              showAllLink
              onShowAll={() => setViewAndUrl('liste')}
            />
            {hasCoalitions && <LiveCoalitionMini lists={lists} />}
          </div>
          <LiveSectionGrid sections={sectionStatus} compact />
          {hasPreferenze && <LivePreferenzePanel lists={lists} electionId={electionId} compact />}
        </div>
      )}

      {view === 'liste' && (
        <div className="space-y-6">
          <LiveDataQualityAlert dataQuality={dataQuality} />
          <LiveListRanking lists={lists} totalListVotes={totalListVotes} />
          <LiveListBarChart lists={lists} totalListVotes={totalListVotes} />
        </div>
      )}

      {view === 'sezioni' && (
        <div className="space-y-6">
          <LiveDataQualityAlert dataQuality={dataQuality} />
          <LiveSectionGrid sections={sectionStatus} />
        </div>
      )}

      {view === 'coalizioni' && hasCoalitions && (
        <div className="space-y-6">
          <LiveCoalitionByField lists={lists} />
        </div>
      )}

      {view === 'seggi' && (
        <div className="space-y-6">
          {projLoading && !proj ? (
            <div className="text-center text-gray-400 py-12">Caricamento proiezione seggi...</div>
          ) : proj ? (
            <LiveSeatProjection
              seats={proj.current.seats}
              totalSeats={proj.totalSeats}
              coverage={proj.coverage}
              sectionsCounted={proj.sectionsCounted}
              totalSections={proj.totalSections}
              electionId={electionId}
            />
          ) : (
            <div className="text-center text-gray-500 py-12">Proiezione non disponibile</div>
          )}
        </div>
      )}

      {view === 'preferenze' && hasPreferenze && (
        <LivePreferenzePanel lists={lists} electionId={electionId} />
      )}
    </div>
  )
}

export default function LiveDashboard(props: {
  electionId: number
  electionName: string
  commune: string
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
