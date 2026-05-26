'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import { formatNumber, formatPercent } from '@/lib/utils'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { TabBar } from '@/components/ui/TabBar'
import { buttonClassName } from '@/components/ui/buttonStyles'
import { LiveStreamStatusBanner } from '@/components/live/LiveStreamStatusBanner'
import { useElectionStream } from '@/hooks/useElectionStream'
import { LIVE_REFRESH_MS } from '@/lib/liveRefresh'
import Link from 'next/link'
import { Calendar, Crown, Landmark, RefreshCw, TrendingUp } from 'lucide-react'
import {
  buildCompareSeries,
  listHasHistoricalMatch,
  type HistElectionSnapshot,
  type HistListRow,
} from '@/lib/historicalCompare'

export interface HistResult {
  id: number
  listName: string
  coalition: string | null
  candidateMayor: string | null
  votes: number
  percentage: number
  seats: number | null
}
export interface HistElection {
  id: number
  name: string
  commune: string
  year: number
  registeredVoters: number | null
  turnoutVoters: number | null
  turnoutPercent: number | null
  results: HistResult[]
}

interface SeatProjection {
  listId: number; listName: string; shortName: string | null; color: string
  votes: number; percentage: number; seats: number; aboveThreshold: boolean
  coalition?: string; candidateMayor?: string
}

interface ProjectionData {
  totalSections: number
  sectionsCounted: number
  coverage: number
  votersCounted: number
  totalTheoreticalVoters: number
  votersCoverage: number
  /** Seggi totali consiglio (da impostazioni elezione) */
  totalSeats: number
  current:  { seats: SeatProjection[]; coalitions: { coalition: string; candidateMayor?: string; totalVotes: number; percentage: number; lists: unknown[] }[]; needsRunoff: boolean; mayorElected?: string }
  projected: { seats: SeatProjection[] }
  projectedLists: { listId: number; listName: string; color: string; votes: number; projectedVotes: number }[]
}

function SeatChart({ seats, totalSeats, title }: { seats: SeatProjection[]; totalSeats: number; title: string }) {
  if (!seats.length) return null
  const filtered = seats.filter(s => s.seats > 0)

  return (
    <div className="surface-panel p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">Totale seggi: {totalSeats}</p>

      {/* Seat bar visualization */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-4">
        {filtered.map(s => (
          <div
            key={s.listId}
            title={`${s.listName}: ${s.seats} seggi (${formatPercent(s.percentage)})`}
            className="transition-all duration-700 flex items-center justify-center text-white text-xs font-bold"
            style={{ width: `${(s.seats / totalSeats) * 100}%`, backgroundColor: s.color }}
          >
            {s.seats >= 2 ? s.seats : ''}
          </div>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-gray-500 dark:text-neutral-400 border-b border-gray-100 dark:border-neutral-800">
          <th className="pb-2">Lista</th>
          <th className="text-right pb-2">Voti %</th>
          <th className="text-right pb-2">Seggi</th>
          <th className="text-right pb-2">Soglia</th>
        </tr></thead>
        <tbody>
          {[...seats].sort((a, b) => b.votes - a.votes).map(s => (
            <tr key={s.listId} className={`border-b border-gray-50 dark:border-neutral-800 last:border-0 ${!s.aboveThreshold ? 'opacity-50' : ''}`}>
              <td className="py-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className={s.aboveThreshold ? 'font-medium' : ''}>{s.listName}</span>
                </div>
              </td>
              <td className="py-1.5 text-right">{formatPercent(s.percentage)}</td>
              <td className="py-1.5 text-right font-bold">{s.aboveThreshold ? s.seats : '—'}</td>
              <td className="py-1.5 text-right text-xs">
                <span className={`px-1.5 py-0.5 rounded ${s.aboveThreshold ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300'}`}>
                  {s.aboveThreshold ? '✓' : '✗'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function turnoutLabel(
  registered: number | null | undefined,
  voters: number | null | undefined,
  percent: number | null | undefined
): string {
  if ((registered ?? 0) <= 0 && (voters ?? 0) <= 0) return 'Affluenza non disponibile'
  const reg = registered ?? 0
  const vot = voters ?? 0
  const pct =
    percent != null && Number.isFinite(percent)
      ? percent
      : reg > 0
        ? (vot / reg) * 100
        : null
  return `Votanti ${formatNumber(vot)} / ${formatNumber(reg)} aventi diritto${pct != null ? ` · ${pct.toFixed(1)}%` : ''}`
}

function TurnoutHeader({
  registered,
  voters,
  percent,
}: {
  registered: number | null | undefined
  voters: number | null | undefined
  percent: number | null | undefined
}) {
  return (
    <p className="text-xs text-gray-500 dark:text-neutral-400 tabular-nums mb-3">
      {turnoutLabel(registered, voters, percent)}
    </p>
  )
}

function toHistListRow(s: SeatProjection): HistListRow {
  return {
    listName: s.listName,
    coalition: s.coalition ?? null,
    candidateMayor: s.candidateMayor ?? null,
    votes: s.votes,
    percentage: s.percentage,
    seats: s.seats,
  }
}

function buildCurrentSnapshot(
  proj: ProjectionData,
  electionName: string,
  electionYear: number
): HistElectionSnapshot {
  return {
    id: 0,
    name: electionName,
    year: electionYear,
    registeredVoters: proj.totalTheoreticalVoters,
    turnoutVoters: proj.votersCounted,
    turnoutPercent: proj.votersCoverage,
    isCurrent: true,
    results: proj.current.seats.map(toHistListRow),
  }
}

function toSnapshot(h: HistElection): HistElectionSnapshot {
  return {
    id: h.id,
    name: h.name,
    year: h.year,
    registeredVoters: h.registeredVoters,
    turnoutVoters: h.turnoutVoters,
    turnoutPercent: h.turnoutPercent,
    results: h.results.map(r => ({
      listName: r.listName,
      coalition: r.coalition,
      candidateMayor: r.candidateMayor,
      votes: r.votes,
      percentage: r.percentage,
      seats: r.seats,
    })),
  }
}

function ElectionSnapshotCard({ election }: { election: HistElectionSnapshot }) {
  return (
    <div className="min-w-0 surface-panel p-4 flex flex-col h-full">
      <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-0.5">
        {election.isCurrent ? 'Elezione attuale' : election.name}
        <span className="font-normal text-gray-500 dark:text-neutral-400"> ({election.year})</span>
      </h4>
      <TurnoutHeader
        registered={election.registeredVoters}
        voters={election.turnoutVoters}
        percent={election.turnoutPercent}
      />
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm min-w-[240px]">
          <thead>
            <tr className="text-xs text-gray-500 dark:text-neutral-400 border-b border-gray-100 dark:border-neutral-800 text-left">
              <th className="pb-2 pr-2">Lista</th>
              <th className="pb-2 pr-2">Sindaco / coal.</th>
              <th className="text-right pb-2">%</th>
              <th className="text-right pb-2">Seggi</th>
            </tr>
          </thead>
          <tbody>
            {[...election.results].sort((a, b) => b.votes - a.votes).map((r, i) => (
              <tr key={`${r.listName}-${i}`} className="border-b border-gray-50 dark:border-neutral-800 last:border-0">
                <td className="py-1.5 font-medium text-gray-900 dark:text-white pr-2">{r.listName}</td>
                <td className="py-1.5 text-xs text-gray-500 dark:text-neutral-400 pr-2 max-w-[8rem] truncate">
                  {r.candidateMayor || r.coalition || '—'}
                </td>
                <td className="py-1.5 text-right tabular-nums">{r.percentage.toFixed(1)}%</td>
                <td className="py-1.5 text-right font-bold tabular-nums">{r.seats ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const HIST_COLORS = ['#063C25', '#E18901', '#16a34a', '#dc2626', '#9333ea', '#0891b2']

function HistoricalCompareView({
  proj,
  electionName,
  electionYear,
  historical,
  hasCoalitions,
}: {
  proj: ProjectionData
  electionName: string
  electionYear: number
  historical: HistElection[]
  hasCoalitions: boolean
}) {
  const current = buildCurrentSnapshot(proj, electionName, electionYear)
  const histSnapshots = historical.map(toSnapshot)
  const allElections = [current, ...histSnapshots.sort((a, b) => b.year - a.year)]

  const series = buildCompareSeries(current, histSnapshots, hasCoalitions)
  const matchedSeries = series.filter(s => s.hasHistoricalMatch && s.points.length >= 2)
  const unmatchedLists = current.results.filter(
    r => !listHasHistoricalMatch(r, histSnapshots, hasCoalitions)
  )

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500 dark:text-neutral-400 max-w-3xl">
        Il confronto usa lo stesso <strong>candidato sindaco</strong>
        {hasCoalitions ? (
          <> oppure la stessa <strong>coalizione</strong></>
        ) : null}
        ; non si accoppia sul solo nome lista. Le percentuali sono calcolate sulla somma dei voti di lista
        del sindaco o della coalizione in ciascuna elezione.
      </p>

      {matchedSeries.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Trend per sindaco / coalizione</h3>
          {matchedSeries.map(({ compare, points }) => {
            const chartData = [{ label: compare.label, ...Object.fromEntries(points.map(p => [p.yearLabel, p.percentage])) }]
            const yearKeys = points.map(p => p.yearLabel)
            return (
              <div key={`${compare.kind}:${compare.key}`} className="surface-panel p-5">
                <h4 className="text-sm font-medium text-gray-800 dark:text-neutral-200 mb-1">
                  {compare.kind === 'mayor' ? 'Sindaco' : 'Coalizione'}: {compare.label}
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
                    <XAxis dataKey="label" hide />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 'auto']} />
                    <Tooltip formatter={(v: number) => [`${Number(v).toFixed(1)}%`, '']} />
                    <Legend />
                    {yearKeys.map((y, i) => (
                      <Bar key={y} dataKey={y} fill={HIST_COLORS[i % HIST_COLORS.length]} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </div>
      )}

      {unmatchedLists.length > 0 && (
        <Alert variant="info" title="Liste senza corrispondenza storica">
          <p className="text-sm mb-2">
            Per le liste sotto non è stato possibile abbinare sindaco o coalizione nello storico. Confronta l’elezione
            attuale con le altre dello stesso comune nella panoramica affiancata.
          </p>
          <ul className="text-sm list-disc pl-5 space-y-0.5">
            {unmatchedLists.map(r => (
              <li key={r.listName}>
                <strong>{r.listName}</strong>
                {r.candidateMayor ? ` · ${r.candidateMayor}` : ''}
                {r.coalition ? ` · ${r.coalition}` : ''}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">Elezioni a confronto (stesso comune)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allElections.map(el => (
            <ElectionSnapshotCard key={el.isCurrent ? 'current' : el.id} election={el} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AnalysisPanel({
  electionId,
  electionName,
  commune,
  electionYear,
  historicalElections,
  hasCoalitions = false,
  embedded = false,
}: {
  electionId: number
  electionName: string
  commune: string
  electionYear: number
  historicalElections: HistElection[]
  /** Coalizioni configurate in admin (campo coalition sulle liste) */
  hasCoalitions?: boolean
  /** Tab dentro la live: senza intestazione elezione duplicata */
  embedded?: boolean
}) {
  const [proj, setProj] = useState<ProjectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'seats' | 'projection' | 'history'>('seats')

  const fetchProj = useCallback(async () => {
    try {
      const res = await fetch(`/api/elections/${electionId}/projections`)
      if (res.ok) setProj(await res.json())
    } catch {}
    setLoading(false)
  }, [electionId])

  const streamStatus = useElectionStream(electionId, fetchProj)

  useEffect(() => {
    fetchProj()
    const t = setInterval(fetchProj, LIVE_REFRESH_MS)
    return () => clearInterval(t)
  }, [electionId, fetchProj])

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-24 text-gray-400 dark:text-neutral-500">Caricamento...</div>
    )
  }
  if (!proj) {
    return <div className="p-8 text-center text-red-500 flex-1">Dati non disponibili</div>
  }

  const councilSeats = typeof proj.totalSeats === 'number' && proj.totalSeats > 0 ? proj.totalSeats : 32

  return (
    <div className={embedded ? 'space-y-4' : 'flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6'}>
      <LiveStreamStatusBanner status={streamStatus} />
        {embedded ? (
          <div className="surface-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-neutral-300">
              Proiezione seggi e confronto storico · {commune}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 px-3 py-1.5 rounded-lg text-gray-700 dark:text-neutral-200 tabular-nums">
                {proj.sectionsCounted} / {proj.totalSections} sezioni ({proj.coverage.toFixed(1)}%)
              </span>
              <Button type="button" variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchProj}>
                Aggiorna
              </Button>
            </div>
          </div>
        ) : (
          <Card>
            <CardBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{electionName}</h1>
                <p className="text-sm text-gray-500 dark:text-neutral-400">{commune}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-700 px-3 py-1.5 rounded-lg text-gray-700 dark:text-neutral-200 tabular-nums">
                  {proj.sectionsCounted} / {proj.totalSections} sezioni ({proj.coverage.toFixed(1)}%)
                </span>
                <Button type="button" variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchProj}>
                  Aggiorna
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        <TabBar
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'seats', label: 'Seggi attuali', icon: Landmark },
            { id: 'projection', label: 'Proiezione finale', icon: TrendingUp },
            { id: 'history', label: 'Confronto storico', icon: Calendar },
          ]}
        />

        {tab === 'seats' && (
          <div className="space-y-6">
            {/* Runoff warning */}
            {proj.current.needsRunoff && (
              <Alert variant="warning" title="Ballottaggio previsto">
                Nessun candidato ha superato il 50% dei voti. Si procederà al secondo turno.
              </Alert>
            )}
            {proj.current.mayorElected && (
              <Alert variant="success" title="Sindaco eletto al primo turno">
                <p className="text-lg font-bold">{proj.current.mayorElected}</p>
              </Alert>
            )}

            <SeatChart seats={proj.current.seats} totalSeats={councilSeats} title="Proiezione seggi – dati attuali" />

            {/* Coalitions */}
            {hasCoalitions && proj.current.coalitions.length > 0 && (
              <div className="surface-panel p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Coalizioni</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    {proj.current.coalitions.map((c, i) => (
                      <div key={c.coalition} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-950 rounded-xl">
                        <div className="flex items-center gap-2">
                          {i === 0 && <Crown className="w-4 h-4 text-amber-500 shrink-0" aria-hidden />}
                          <div>
                            <p className="font-semibold text-sm">{c.coalition}</p>
                            {c.candidateMayor &&
                              c.candidateMayor.trim() !== c.coalition.trim() && (
                                <p className="text-xs text-gray-500 dark:text-neutral-400">
                                  Sindaco: {c.candidateMayor}
                                </p>
                              )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatPercent(c.percentage)}</p>
                          <p className="text-xs text-gray-400 dark:text-neutral-500">{formatNumber(c.totalVotes)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={proj.current.coalitions}
                        dataKey="totalVotes"
                        nameKey="coalition"
                        cx="50%" cy="50%"
                        outerRadius={80}
                        label={({ percentage }: { percentage: number }) => `${formatPercent(percentage)}`}
                      >
                        {proj.current.coalitions.map((_, i) => (
                          <Cell key={i} fill={['#063C25', '#E18901', '#16a34a', '#dc2626', '#9333ea'][i % 5]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatNumber(v), 'Voti']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'projection' && (
          <div className="space-y-6">
            <Alert variant="info" title="Metodo di proiezione">
              Basato su votanti: <strong>{proj.votersCounted.toLocaleString('it-IT')} / {proj.totalTheoreticalVoters.toLocaleString('it-IT')}</strong> votanti ({proj.votersCoverage.toFixed(1)}%).
              Per ogni lista si stima la quota finale proiettando l’andamento delle sezioni già scrutinate sui votanti attesi fino alla fine.
            </Alert>

            <SeatChart seats={proj.projected.seats} totalSeats={councilSeats} title="Proiezione seggi – stima voti finali" />

            {/* Projected votes comparison */}
            <div className="surface-panel p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Voti attuali vs proiettati</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={proj.projectedLists.map(l => ({
                    name: l.listName.slice(0, 15),
                    Attuali: l.votes,
                    Proiettati: l.projectedVotes,
                    color: l.color,
                  }))}
                  margin={{ top: 8, right: 12, bottom: 100, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
                  <Tooltip formatter={(v: number) => [formatNumber(v), '']} />
                  <Legend wrapperStyle={{ paddingTop: 24 }} />
                  <Bar dataKey="Attuali"    fill="#93c5fd" radius={[3,3,0,0]} />
                  <Bar dataKey="Proiettati" fill="#063C25" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-6">
            {historicalElections.length === 0 ? (
              <Card>
                <CardBody className="py-12 text-center text-gray-500">
                  <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" aria-hidden />
                  <p>Nessun dato storico disponibile per questo comune.</p>
                  <Link href="/admin/historical" className={buttonClassName('ghost', 'sm', 'mt-4 inline-flex')}>
                    Aggiungi dati storici →
                  </Link>
                </CardBody>
              </Card>
            ) : (
              <HistoricalCompareView
                proj={proj}
                electionName={electionName}
                electionYear={electionYear}
                historical={historicalElections}
                hasCoalitions={hasCoalitions}
              />
            )}
          </div>
        )}
    </div>
  )
}
