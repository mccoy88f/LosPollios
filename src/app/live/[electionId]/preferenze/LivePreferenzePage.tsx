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
import { formatNumber } from '@/lib/utils'

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

const PIE_EXTRA = ['#063C25', '#E18901', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#78716c']

const RADIAN = Math.PI / 180

function piePercentLabel(props: {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props
  if (percent < 0.06) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
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
      <div className="flex-1 flex items-center justify-center py-24 text-gray-400 dark:text-neutral-500">
        Caricamento preferenze…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 p-8 text-center text-red-600">Dati non disponibili</div>
    )
  }

  const listsWithPrefs = data.lists.filter(l => l.candidates.length > 0)

  const hasAnyMayorHistory = listsWithPrefs.some(l =>
    l.candidates.some(
      c => c.personId != null && (data.mayorHistoryByPersonId[String(c.personId)] ?? []).length > 0
    )
  )

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Preferenze candidati</h1>
        <p className="text-gray-600 dark:text-neutral-400 text-sm mt-1">
          {data.election.name} · {commune} — dati aggregati dalle sezioni già inserite.
        </p>
      </div>

      {listsWithPrefs.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-8 text-center text-gray-500 dark:text-neutral-400">
          Nessuna preferenza registrata finora. Inserisci i dati nelle sezioni con candidati e preferenze.
        </div>
      ) : (
        listsWithPrefs.map(list => {
          const pieData = list.candidates
            .filter(c => c.votes > 0)
            .map(c => ({ name: c.name, value: c.votes }))

          const historyCharts = list.candidates
            .filter(c => c.personId != null)
            .flatMap(c => {
              const hist = data.mayorHistoryByPersonId[String(c.personId!)] ?? []
              if (hist.length === 0) return []
              const chartRows = hist.map(h => ({
                label: String(h.year),
                percentage: h.percentage,
                electionName: h.electionName,
                listName: h.listName,
              }))
              return [
                <div key={c.candidateId} className="bg-gray-50 dark:bg-neutral-950 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">{c.name}</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
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
            })

          return (
            <div
              key={list.listId}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                {list.listLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={list.listLogoUrl} alt="" className="w-10 h-10 object-contain rounded border border-gray-100 dark:border-neutral-700" />
                ) : (
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: list.color }} />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{list.listName}</h2>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Voti di lista: <strong>{formatNumber(list.listVotes)}</strong>
                    {list.candidateMayor && <> · Sindaco: {list.candidateMayor}</>}
                    {list.coalition && <> · {list.coalition}</>}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                    Distribuzione preferenze
                  </h3>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          labelLine={false}
                          label={piePercentLabel}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? list.color : PIE_EXTRA[(i + 1) % PIE_EXTRA.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number, _n, item) => [
                            formatNumber(v),
                            (item?.payload as { name?: string })?.name ?? 'Preferenze',
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-400">Nessun voto preferenza ancora.</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Dettaglio</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 dark:text-neutral-400 border-b border-gray-200 dark:border-neutral-700">
                        <th className="pb-2 pr-2">Candidato</th>
                        <th className="pb-2 text-right">Preferenze</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.candidates.map(c => (
                        <tr key={c.candidateId} className="border-b border-gray-50 dark:border-neutral-800">
                          <td className="py-2 pr-2 text-gray-900 dark:text-white">{c.name}</td>
                          <td className="py-2 text-right font-medium tabular-nums">{formatNumber(c.votes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {historyCharts.length > 0 && (
                <div className="border-t border-gray-100 dark:border-neutral-800 pt-4 space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-neutral-300">
                    Trend storico (quota lista come sindaco)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{historyCharts}</div>
                </div>
              )}
            </div>
          )
        })
      )}

      {hasAnyMayorHistory && (
        <p className="text-xs text-gray-500 dark:text-neutral-500 max-w-3xl pb-2">
          Il <strong>trend storico</strong>, quando presente, indica la percentuale di <strong>voti di lista</strong> in
          elezioni passate in cui il candidato risulta collegato in anagrafica come sindaco su dati storici importati —
          non sono preferenze per candidato archiviate, ma un confronto sulla quota lista.
        </p>
      )}

      <div className="text-center pb-4">
        <Link href={`/live/${electionId}`} className="text-brand-600 dark:text-brand-400 hover:underline text-sm">
          ← Torna alla live
        </Link>
      </div>
    </div>
  )
}
