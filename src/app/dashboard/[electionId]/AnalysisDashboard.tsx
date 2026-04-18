'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import { formatNumber, formatPercent } from '@/lib/utils'
import { SiteTopNav } from '@/components/SiteTopNav'

interface HistResult { id: number; listName: string; coalition: string | null; candidateMayor: string | null; votes: number; percentage: number; seats: number | null }
interface HistElection { id: number; name: string; commune: string; year: number; results: HistResult[] }

interface SeatProjection {
  listId: number; listName: string; shortName: string | null; color: string
  votes: number; percentage: number; seats: number; aboveThreshold: boolean
  coalition?: string; candidateMayor?: string
}

interface ProjectionData {
  totalSections: number
  sectionsCounted: number
  coverage: number
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

function HistoricalComparison({ current, historical }: { current: SeatProjection[]; historical: HistElection[] }) {
  if (!historical.length) return null

  const allLists = new Set([
    ...current.map(l => l.listName),
    ...historical.flatMap(e => e.results.map(r => r.listName)),
  ])

  const compareData = Array.from(allLists).map(listName => {
    const row: Record<string, unknown> = { listName }
    const cur = current.find(l => l.listName.toLowerCase().includes(listName.toLowerCase().slice(0, 8)) || listName.toLowerCase().includes(l.listName.toLowerCase().slice(0, 8)))
    if (cur) row['Attuale'] = parseFloat(cur.percentage.toFixed(1))
    for (const h of historical) {
      const r = h.results.find(r => r.listName.toLowerCase().includes(listName.toLowerCase().slice(0, 8)) || listName.toLowerCase().includes(r.listName.toLowerCase().slice(0, 8)))
      if (r) row[String(h.year)] = r.percentage
    }
    return row
  }).filter(r => Object.keys(r).length > 1)

  if (!compareData.length) return null

  const years = ['Attuale', ...historical.map(h => String(h.year))]
  const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2']

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Confronto storico – % voti per lista</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={compareData} margin={{ top: 0, right: 0, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="listName" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
          <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, '']} />
          <Legend />
          {years.map((y, i) => <Bar key={y} dataKey={y} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function AnalysisDashboard({
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
      <div className="min-h-screen bg-gray-50">
        <SiteTopNav
          crumbs={[
            { label: 'Home', href: '/' },
            { label: electionName },
            { label: 'Analisi' },
          ]}
          contextLinks={[{ label: 'Live', href: `/live/${electionId}` }]}
        />
        <div className="flex items-center justify-center py-24 text-gray-400">Caricamento...</div>
      </div>
    )
  }
  if (!proj) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SiteTopNav
          crumbs={[
            { label: 'Home', href: '/' },
            { label: electionName },
            { label: 'Analisi' },
          ]}
          contextLinks={[{ label: 'Live', href: `/live/${electionId}` }]}
        />
        <div className="p-8 text-center text-red-500">Dati non disponibili</div>
      </div>
    )
  }

  const totalSeats = proj.current.seats.reduce((s, l) => s + l.seats, 0) || 32

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteTopNav
        crumbs={[
          { label: 'Home', href: '/' },
          { label: electionName },
          { label: 'Analisi e proiezioni' },
        ]}
        contextLinks={[{ label: 'Live', href: `/live/${electionId}` }]}
      />
      <div className="bg-slate-100 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-gray-700">
            <span className="font-medium text-gray-900">{electionName}</span>
            <span className="text-gray-400 mx-2">·</span>
            {commune}
          </p>
          <div className="flex items-center gap-3">
            <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-gray-700">
              {proj.sectionsCounted} / {proj.totalSections} sezioni ({proj.coverage.toFixed(1)}%)
            </span>
            <button
              type="button"
              onClick={fetchProj}
              className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              ↻ Aggiorna
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab nav */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6 w-fit">
          {[['seats', '🏛️ Seggi attuali'], ['projection', '📈 Proiezione finale'], ['history', '📅 Confronto storico']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as typeof tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'seats' && (
          <div className="space-y-6">
            {/* Runoff warning */}
            {proj.current.needsRunoff && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-yellow-800">Ballottaggio previsto</p>
                  <p className="text-yellow-700 text-sm">Nessun candidato ha superato il 50% dei voti. Si procederà al secondo turno.</p>
                </div>
              </div>
            )}
            {proj.current.mayorElected && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-semibold text-green-800">Sindaco eletto al primo turno</p>
                  <p className="text-green-700 text-xl font-bold">{proj.current.mayorElected}</p>
                </div>
              </div>
            )}

            <SeatChart seats={proj.current.seats} totalSeats={totalSeats} title="Proiezione seggi – dati attuali" />

            {/* Coalitions */}
            {proj.current.coalitions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Coalizioni</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    {proj.current.coalitions.map((c, i) => (
                      <div key={c.coalition} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2">
                          {i === 0 && <span>👑</span>}
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
                          <Cell key={i} fill={['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c'][i % 5]} />
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
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-blue-800 text-sm">
                <strong>Proiezione basata su {proj.sectionsCounted} / {proj.totalSections} sezioni ({proj.coverage.toFixed(1)}%)</strong><br />
                I voti finali sono estrapolati proporzionalmente dalle sezioni già scrutinate.
              </p>
            </div>

            <SeatChart seats={proj.projected.seats} totalSeats={totalSeats} title="Proiezione seggi – stima voti finali" />

            {/* Projected votes comparison */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Voti attuali vs proiettati</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={proj.projectedLists.map(l => ({
                    name: l.listName.slice(0, 15),
                    Attuali: l.votes,
                    Proiettati: l.projectedVotes,
                    color: l.color,
                  }))}
                  margin={{ top: 0, right: 0, bottom: 40, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatNumber(v)} />
                  <Tooltip formatter={(v: number) => [formatNumber(v), '']} />
                  <Legend />
                  <Bar dataKey="Attuali"    fill="#93c5fd" radius={[3,3,0,0]} />
                  <Bar dataKey="Proiettati" fill="#2563eb" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-6">
            {historicalElections.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <p className="text-3xl mb-3">📅</p>
                <p>Nessun dato storico disponibile per questo comune.</p>
                <a href="/admin/historical" className="text-blue-600 hover:underline text-sm mt-2 block">
                  Aggiungi dati storici →
                </a>
              </div>
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
    </div>
  )
}
