'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { formatNumber, formatPercent } from '@/lib/utils'
import { SiteTopNav } from '@/components/SiteTopNav'

type MayorHistPoint = {
  year: number
  electionName: string
  listName: string
  percentage: number
  votes: number
}

type CandidateRow = {
  candidateId: number
  name: string
  votes: number
  listId: number
  personId: number | null
  order: number
  pctOfListVotes: number
}

type ListBlock = {
  listId: number
  listName: string
  shortName: string | null
  color: string
  listLogoUrl?: string | null
  coalitionLogoUrl?: string | null
  candidateMayor: string | null
  coalition: string | null
  listVotes: number
  candidates: CandidateRow[]
}

type DetailPayload = {
  election: { id: number; name: string; commune: string }
  lists: ListBlock[]
  mayorHistoryByPersonId: Record<string, MayorHistPoint[]>
}

export default function LivePreferenzePage({
  electionId,
  electionName,
  commune,
}: {
  electionId: number
  electionName: string
  commune: string
}) {
  const [data, setData] = useState<DetailPayload | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/elections/${electionId}/preferences-detail`)
      if (res.ok) setData(await res.json())
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [electionId])

  useEffect(() => {
    fetchData()
    const es = new EventSource(`/api/elections/${electionId}/stream`)
    es.onmessage = () => fetchData()
    es.onerror = () => es.close()
    const t = setInterval(fetchData, 30000)
    return () => {
      es.close()
      clearInterval(t)
    }
  }, [electionId, fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        Caricamento preferenze…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center text-red-600">
        Dati non disponibili
      </div>
    )
  }

  const listsWithPrefs = data.lists.filter(l => l.candidates.length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteTopNav
        crumbs={[
          { label: 'Home', href: '/' },
          { label: electionName, href: `/live/${electionId}` },
          { label: 'Preferenze' },
        ]}
        contextLinks={[
          { label: 'Live', href: `/live/${electionId}` },
          { label: 'Aggiornamenti', href: `/live/${electionId}/aggiornamenti` },
          { label: 'Analisi', href: `/dashboard/${electionId}` },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preferenze candidati</h1>
          <p className="text-gray-600 text-sm mt-1">
            {data.election.name} · {commune} — dati aggregati dalle sezioni già inserite. Aggiornamento in tempo reale come la live.
          </p>
          <p className="text-xs text-gray-500 mt-2 max-w-3xl">
            Lo <strong>storico</strong> mostra la percentuale <strong>di lista</strong> nelle elezioni passate in cui la stessa persona è collegata in anagrafica come{' '}
            <strong>candidato sindaco</strong> su un risultato storico importato: non sono preferenze per candidato conservate nello storico, ma un indicatore di tendenza della quota lista associata a quel sindaco.
          </p>
        </div>

        {listsWithPrefs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Nessuna preferenza registrata finora. Inserisci i dati nelle sezioni con candidati e preferenze.
          </div>
        ) : (
          listsWithPrefs.map(list => {
            const pieData = list.candidates
              .filter(c => c.votes > 0)
              .map(c => ({ name: c.name, value: c.votes }))

            const pieFills = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#64748b']

            return (
              <div key={list.listId} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  {list.listLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={list.listLogoUrl} alt="" className="w-10 h-10 object-contain rounded border border-gray-100" />
                  ) : (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: list.color }} />
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{list.listName}</h2>
                    <p className="text-xs text-gray-500">
                      Voti di lista: <strong>{formatNumber(list.listVotes)}</strong>
                      {list.candidateMayor && <> · Sindaco: {list.candidateMayor}</>}
                      {list.coalition && <> · {list.coalition}</>}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Distribuzione preferenze</h3>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={({ name, percent }) => `${name.slice(0, 18)}${name.length > 18 ? '…' : ''} ${(percent * 100).toFixed(1)}%`}
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={i === 0 ? list.color : pieFills[(i + 1) % pieFills.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => [formatNumber(v), 'Preferenze']} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-gray-400">Nessun voto preferenza ancora.</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Dettaglio</h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b">
                          <th className="pb-2 pr-2">Candidato</th>
                          <th className="pb-2 text-right">Preferenze</th>
                          <th className="pb-2 text-right">% su voti lista</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.candidates.map(c => (
                          <tr key={c.candidateId} className="border-b border-gray-50">
                            <td className="py-2 pr-2">
                              {c.name}
                              {c.personId == null && (
                                <span className="block text-[10px] text-amber-700">Nessuna anagrafica — storico sindaco non disponibile</span>
                              )}
                            </td>
                            <td className="py-2 text-right font-medium">{formatNumber(c.votes)}</td>
                            <td className="py-2 text-right text-gray-600">{c.pctOfListVotes.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {list.candidates.some(c => c.personId != null) && (
                  <div className="border-t border-gray-100 pt-4 space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">Trend storico (quota lista come sindaco)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {list.candidates
                        .filter(c => c.personId != null)
                        .flatMap(c => {
                          const hist = data.mayorHistoryByPersonId[String(c.personId!)] ?? []
                          if (hist.length === 0) return []
                          const chartRows = hist.map(h => ({
                            label: String(h.year),
                            year: h.year,
                            percentage: h.percentage,
                            electionName: h.electionName,
                            listName: h.listName,
                          }))
                          return [
                            <div key={c.candidateId} className="bg-gray-50 rounded-lg p-4">
                              <p className="text-sm font-semibold text-gray-800 mb-1">{c.name}</p>
                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                  <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={v => `${v}%`} />
                                  <Tooltip
                                    formatter={(v: number) => [`${v.toFixed(1)}%`, 'Quota lista']}
                                    labelFormatter={(_, payload) =>
                                      payload?.[0]?.payload
                                        ? `${payload[0].payload.electionName} (${payload[0].payload.listName})`
                                        : ''
                                    }
                                  />
                                  <Line type="monotone" dataKey="percentage" stroke={list.color} strokeWidth={2} dot />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>,
                          ]
                        })}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}

        <div className="text-center pb-8">
          <Link href={`/live/${electionId}`} className="text-blue-600 hover:underline text-sm">
            ← Torna alla live
          </Link>
        </div>
      </div>
    </div>
  )
}
