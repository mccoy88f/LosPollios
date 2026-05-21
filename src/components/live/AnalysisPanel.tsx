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
import Link from 'next/link'
import { Calendar, Crown, Landmark, RefreshCw, TrendingUp } from 'lucide-react'

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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">Totale seggi: {totalSeats}</p>

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
        <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
          <th className="pb-2">Lista</th>
          <th className="text-right pb-2">Voti %</th>
          <th className="text-right pb-2">Seggi</th>
          <th className="text-right pb-2">Soglia</th>
        </tr></thead>
        <tbody>
          {[...seats].sort((a, b) => b.votes - a.votes).map(s => (
            <tr key={s.listId} className={`border-b border-gray-50 last:border-0 ${!s.aboveThreshold ? 'opacity-50' : ''}`}>
              <td className="py-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className={s.aboveThreshold ? 'font-medium' : ''}>{s.listName}</span>
                </div>
              </td>
              <td className="py-1.5 text-right">{formatPercent(s.percentage)}</td>
              <td className="py-1.5 text-right font-bold">{s.aboveThreshold ? s.seats : '—'}</td>
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
  )
}

/** Normalizza sindaco / coalizione per confronti stabili */
function normCompareKey(s: string | null | undefined): string {
  if (s == null || !String(s).trim()) return ''
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Accoppia una lista attuale a una riga storico nello stesso anno:
 * 1) stesso candidato sindaco (se valorizzato su entrambi);
 * 2) altrimenti stessa coalizione (se valorizzata sulla lista attuale e sulla riga storica).
 * Nessun match sul solo nome lista.
 */
function findHistoricalMatch(cur: SeatProjection, results: HistResult[]): HistResult | null {
  const mayorCur = normCompareKey(cur.candidateMayor)
  const coalCur = normCompareKey(cur.coalition)

  if (mayorCur) {
    const byMayor = results.filter(r => normCompareKey(r.candidateMayor) === mayorCur)
    if (byMayor.length === 1) return byMayor[0]
    if (byMayor.length > 1 && coalCur) {
      const byBoth = byMayor.filter(r => normCompareKey(r.coalition) === coalCur)
      if (byBoth.length >= 1) return byBoth[0]
    }
    if (byMayor.length > 1) return byMayor[0]
  }

  if (coalCur) {
    const byCoal = results.filter(r => normCompareKey(r.coalition) === coalCur)
    if (byCoal.length === 1) return byCoal[0]
    if (byCoal.length > 1 && mayorCur) {
      const byBoth = byCoal.filter(r => normCompareKey(r.candidateMayor) === mayorCur)
      if (byBoth.length >= 1) return byBoth[0]
    }
    if (byCoal.length >= 1) return byCoal[0]
  }

  return null
}

function HistoricalComparison({ current, historical }: { current: SeatProjection[]; historical: HistElection[] }) {
  if (!historical.length) return null

  const compareData = current
    .map(cur => {
      const row: Record<string, unknown> = { listName: cur.listName }
      row['Attuale'] = parseFloat(cur.percentage.toFixed(1))
      for (const h of historical) {
        const r = findHistoricalMatch(cur, h.results)
        if (r) row[String(h.year)] = r.percentage
      }
      return row
    })
    .filter(r => {
      const keys = Object.keys(r).filter(k => k !== 'listName')
      const hasCurrent = keys.includes('Attuale')
      const hasAnyHistory = keys.some(k => k !== 'Attuale')
      return hasCurrent && hasAnyHistory
    })

  if (!compareData.length) return null

  const years = ['Attuale', ...historical.map(h => String(h.year))]
  const COLORS = ['#063C25', '#E18901', '#16a34a', '#dc2626', '#9333ea', '#0891b2']

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Confronto storico – % voti per lista</h3>
      <p className="text-xs text-gray-500 mb-3">
        Le serie storiche sono accoppiate alla lista attuale solo se coincide il <strong>candidato sindaco</strong>;
        in assenza di sindaco confrontabile si usa la <strong>coalizione</strong>. Nessun accoppiamento sul solo nome lista.
      </p>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={compareData} margin={{ top: 8, right: 12, bottom: 100, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="listName" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={70} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
          <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, '']} />
          <Legend wrapperStyle={{ paddingTop: 24 }} />
          {years.map((y, i) => <Bar key={y} dataKey={y} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function AnalysisPanel({
  electionId,
  electionName,
  commune,
  historicalElections,
  embedded = false,
}: {
  electionId: number
  electionName: string
  commune: string
  historicalElections: HistElection[]
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

  useEffect(() => {
    fetchProj()
    const es = new EventSource(`/api/elections/${electionId}/stream`)
    es.onmessage = fetchProj
    const t = setInterval(fetchProj, 30000)
    return () => { es.close(); clearInterval(t) }
  }, [electionId, fetchProj])

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-24 text-gray-400">Caricamento...</div>
    )
  }
  if (!proj) {
    return <div className="p-8 text-center text-red-500 flex-1">Dati non disponibili</div>
  }

  const councilSeats = typeof proj.totalSeats === 'number' && proj.totalSeats > 0 ? proj.totalSeats : 32

  return (
    <div className={embedded ? 'space-y-4' : 'flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6'}>
        {embedded ? (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-600">
              Proiezione seggi e confronto storico · {commune}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 tabular-nums">
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
                <h1 className="text-xl font-bold text-gray-900">{electionName}</h1>
                <p className="text-sm text-gray-500">{commune}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700 tabular-nums">
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
            {proj.current.coalitions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Coalizioni</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    {proj.current.coalitions.map((c, i) => (
                      <div key={c.coalition} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2">
                          {i === 0 && <Crown className="w-4 h-4 text-amber-500 shrink-0" aria-hidden />}
                          <div>
                            <p className="font-semibold text-sm">{c.candidateMayor || c.coalition}</p>
                            {c.candidateMayor && <p className="text-xs text-gray-500">{c.coalition}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatPercent(c.percentage)}</p>
                          <p className="text-xs text-gray-400">{formatNumber(c.totalVotes)}</p>
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
              Basato su <strong>{proj.sectionsCounted} / {proj.totalSections}</strong> sezioni ({proj.coverage.toFixed(1)}%).
              I voti finali sono estrapolati proporzionalmente dalle sezioni già scrutinate.
            </Alert>

            <SeatChart seats={proj.projected.seats} totalSeats={councilSeats} title="Proiezione seggi – stima voti finali" />

            {/* Projected votes comparison */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Voti attuali vs proiettati</h3>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
              <>
                <HistoricalComparison current={proj.current.seats} historical={historicalElections} />

                {/* Historical tables */}
                {historicalElections.map(h => (
                  <div key={h.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3">{h.name} ({h.year})</h3>
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-gray-500 border-b border-gray-100 text-left">
                        <th className="pb-2">Lista</th><th className="pb-2">Coalizione</th><th className="text-right pb-2">Voti</th><th className="text-right pb-2">%</th><th className="text-right pb-2">Seggi</th>
                      </tr></thead>
                      <tbody>
                        {h.results.map(r => (
                          <tr key={r.id} className="border-b border-gray-50 last:border-0">
                            <td className="py-1.5 font-medium">{r.listName}</td>
                            <td className="py-1.5 text-gray-500 text-xs">{r.coalition || '—'}</td>
                            <td className="py-1.5 text-right">{formatNumber(r.votes)}</td>
                            <td className="py-1.5 text-right">{r.percentage.toFixed(1)}%</td>
                            <td className="py-1.5 text-right font-bold">{r.seats ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
    </div>
  )
}
