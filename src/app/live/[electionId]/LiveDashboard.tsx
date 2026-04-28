'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { formatNumber, formatPercent } from '@/lib/utils'
import { SiteTopNav } from '@/components/SiteTopNav'

interface ListResult {
  listId: number; listName: string; shortName: string | null; color: string
  listLogoUrl?: string | null
  coalitionLogoUrl?: string | null
  candidateMayor: string | null; coalition: string | null; votes: number
  candidates: { candidateId: number; name: string; votes: number; listId: number; personId?: number | null; order?: number }[]
}

interface SectionStatus {
  id: number; number: number; name: string | null
  theoreticalVoters: number; hasTurnout: boolean; hasResults: boolean
  votersActual: number | null; turnoutPct: number | null
}

interface ResultsData {
  election: { id: number; name: string; commune: string; date: string; type: string; totalSeats: number; threshold: number; status: string }
  progress:  { totalSections: number; sectionsCounted: number; percentage: number }
  turnout:   { totalTheoretical: number; totalActual: number; totalValid: number; totalNull: number; totalBlank: number; percentage: number }
  lists:     ListResult[]
  sectionStatus: SectionStatus[]
  lastUpdate: string
}

function CoalitionSummary({ lists }: { lists: ListResult[] }) {
  const coalitionMap = new Map<string, { votes: number; mayor?: string; color: string }>()
  const total = lists.reduce((s, l) => s + l.votes, 0)

  for (const l of lists) {
    const key = l.coalition ?? l.candidateMayor ?? l.listName
    if (!coalitionMap.has(key)) coalitionMap.set(key, { votes: 0, mayor: l.candidateMayor ?? undefined, color: l.color })
    coalitionMap.get(key)!.votes += l.votes
  }

  const coalitions = Array.from(coalitionMap.entries())
    .map(([name, c]) => ({ name, ...c, pct: total > 0 ? (c.votes / total) * 100 : 0 }))
    .sort((a, b) => b.votes - a.votes)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Coalizioni / Candidati sindaco</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div>
          {coalitions.map((c, i) => (
            <div key={c.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2">
                {i === 0 && <span className="text-yellow-500">👑</span>}
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                <div>
                  <div className="font-medium text-sm text-gray-900">{c.mayor || c.name}</div>
                  {c.mayor && <div className="text-xs text-gray-400">{c.name}</div>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">{formatPercent(c.pct)}</div>
                <div className="text-xs text-gray-400">{formatNumber(c.votes)}</div>
              </div>
            </div>
          ))}
        </div>
        {total > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={coalitions} dataKey="votes" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {coalitions.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${formatNumber(v)} voti`, '']} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function SectionGrid({ sections }: { sections: SectionStatus[] }) {
  const counted = sections.filter(s => s.hasTurnout).length
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Sezioni</h3>
        <span className="text-sm text-gray-500">{counted} / {sections.length} scrutinate</span>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
        {sections.map(s => (
          <div
            key={s.id}
            title={`Sezione ${s.number}${s.name ? ` – ${s.name}` : ''}${s.votersActual != null ? `\n${s.votersActual} votanti` : ''}`}
            className={`aspect-square rounded flex items-center justify-center text-xs font-semibold transition-colors
              ${s.hasResults ? 'bg-green-500 text-white' : s.hasTurnout ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-100 text-gray-400'}`}
          >
            {s.number}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Con voti</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> Solo affluenza</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> Non iniziata</span>
      </div>
    </div>
  )
}

export default function LiveDashboard({
  electionId,
  electionName,
  commune,
}: {
  electionId: number
  electionName: string
  commune: string
}) {
  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastPulse, setLastPulse] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/elections/${electionId}/results`)
      if (res.ok) {
        setData(await res.json())
        setLastPulse(new Date())
      }
    } catch {}
    setLoading(false)
  }, [electionId])

  useEffect(() => {
    fetchData()

    // SSE for real-time updates
    const evtSource = new EventSource(`/api/elections/${electionId}/stream`)
    evtSource.onmessage = () => fetchData()
    evtSource.onerror = () => evtSource.close()

    // Fallback polling every 30s
    const interval = setInterval(fetchData, 30000)

    return () => {
      evtSource.close()
      clearInterval(interval)
    }
  }, [electionId, fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SiteTopNav
          crumbs={[
            { label: 'Home', href: '/' },
            { label: electionName },
            { label: 'Live' },
          ]}
          contextLinks={[{ label: 'Analisi', href: `/dashboard/${electionId}` }]}
        />
        <div className="flex items-center justify-center py-24">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-3 animate-spin">⏳</div>
            <p>Caricamento risultati...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return <div className="p-8 text-center text-red-500">Elezione non trovata</div>

  const { election, progress, turnout, lists, sectionStatus } = data
  const totalListVotes = lists.reduce((s, l) => s + l.votes, 0)

  const chartData = lists
    .filter(l => l.votes > 0)
    .sort((a, b) => b.votes - a.votes)
    .map(l => ({
      name: l.shortName || l.listName.slice(0, 12),
      votes: l.votes,
      pct: totalListVotes > 0 ? (l.votes / totalListVotes) * 100 : 0,
      color: l.color,
    }))

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteTopNav
        crumbs={[
          { label: 'Home', href: '/' },
          { label: electionName },
          { label: 'Live' },
        ]}
        contextLinks={[{ label: 'Analisi', href: `/dashboard/${electionId}` }]}
      />
      <div className="bg-blue-900 text-white py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">{election.name}</h1>
              <p className="text-blue-200">{commune}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{progress.percentage.toFixed(1)}%</div>
                <div className="text-blue-200 text-xs">Sezioni scrutinate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{formatPercent(turnout.percentage)}</div>
                <div className="text-blue-200 text-xs">Affluenza</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{progress.sectionsCounted}/{progress.totalSections}</div>
                <div className="text-blue-200 text-xs">Sezioni</div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 bg-blue-900/50 rounded-full h-3">
            <div
              className="bg-green-400 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-blue-200 mt-1">
            <span>{progress.sectionsCounted} sezioni scrutinate</span>
            {lastPulse && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" /> Live · {lastPulse.toLocaleTimeString('it-IT')}</span>}
            <span>{progress.totalSections - progress.sectionsCounted} mancanti</span>
          </div>
          {lists.some(l => l.candidates.length > 0) && (
            <div className="mt-4 text-center">
              <Link
                href={`/live/${electionId}/preferenze`}
                className="inline-block text-sm font-medium text-white bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors"
              >
                Distribuzione preferenze e confronto storico →
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Turnout stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Aventi diritto', value: formatNumber(turnout.totalTheoretical), sub: '' },
            { label: 'Votanti',        value: formatNumber(turnout.totalActual),      sub: formatPercent(turnout.percentage) },
            { label: 'Schede valide',  value: formatNumber(turnout.totalValid),       sub: turnout.totalActual > 0 ? formatPercent(turnout.totalValid / turnout.totalActual * 100) : '—' },
            { label: 'Voti di lista',  value: formatNumber(totalListVotes),           sub: '' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              {s.sub && <p className="text-sm text-blue-600 font-medium">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Lists results */}
        {lists.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Risultati liste</h3>
            <div className="space-y-2">
              {[...lists].sort((a, b) => b.votes - a.votes).map(list => {
                const pct = totalListVotes > 0 ? (list.votes / totalListVotes) * 100 : 0
                return (
                  <div key={list.listId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
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
                        <span className="font-medium text-sm text-gray-900">{list.listName}</span>
                        {list.candidateMayor && <span className="text-xs text-gray-400 hidden sm:inline">{list.candidateMayor}</span>}
                        {list.coalition && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded hidden sm:inline">{list.coalition}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-900">{formatPercent(pct)}</span>
                        <span className="text-sm text-gray-500 w-24 text-right">{formatNumber(list.votes)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: list.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bar chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Confronto liste</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Percentuale']} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Coalition summary */}
        {lists.length > 0 && <CoalitionSummary lists={lists} />}

        {/* Section grid */}
        <SectionGrid sections={sectionStatus} />

        {/* Top candidates */}
        {lists.some(l => l.candidates.length > 0) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-gray-900">Preferenze candidati (aggregate)</h3>
              <Link href={`/live/${electionId}/preferenze`} className="text-sm text-blue-600 hover:underline font-medium">
                Apri dettaglio con grafici →
              </Link>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Preferenze pervenute finora da tutte le sezioni già inserite. La colonna «% lista» è la quota sul totale voti di lista di quella lista.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...lists].sort((a, b) => b.votes - a.votes).filter(l => l.candidates.length > 0).map(list => {
                const prefTotal = list.candidates.reduce((s, c) => s + c.votes, 0)
                return (
                  <div key={list.listId}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                      <h4 className="text-sm font-semibold text-gray-700">{list.listName}</h4>
                      <span className="text-xs text-gray-400">
                        Σ pref. {formatNumber(prefTotal)}
                        {list.votes > 0 && prefTotal !== list.votes && (
                          <span title="Può differire dai voti lista se non tutte le schede hanno preferenze valorizzate"> · lista {formatNumber(list.votes)}</span>
                        )}
                      </span>
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                      {[...list.candidates]
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || b.votes - a.votes)
                        .map(c => {
                          const pctList = list.votes > 0 ? (c.votes / list.votes) * 100 : 0
                          return (
                            <div key={c.candidateId} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5 gap-2">
                              <span className="text-gray-700 truncate">{c.name}</span>
                              <span className="shrink-0 text-xs text-gray-500 w-14 text-right">{pctList.toFixed(1)}%</span>
                              <span className="font-semibold text-gray-900 w-20 text-right">{formatNumber(c.votes)}</span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="text-center text-xs text-gray-400 pb-4">
          <a href={`/dashboard/${electionId}`} className="text-blue-600 hover:underline">Vai all&apos;analisi dettagliata e proiezioni seggi →</a>
        </div>
      </div>
    </div>
  )
}
