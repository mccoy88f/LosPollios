'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { SiteTopNav } from '@/components/SiteTopNav'
import type { ElectionUpdateEvent, ElectionUpdateKind } from '@/lib/electionUpdates'

type UpdatesPayload = {
  election: { id: number; name: string; commune: string }
  serverTime: string
  lastDataUpdateAt: string | null
  events: ElectionUpdateEvent[]
}

function kindLabel(k: ElectionUpdateKind): string {
  switch (k) {
    case 'affluenza':
      return 'Affluenza sezione'
    case 'voti_lista':
      return 'Voti di lista'
    case 'preferenze':
      return 'Preferenze candidato'
    default:
      return k
  }
}

function kindBadgeClass(k: ElectionUpdateKind): string {
  switch (k) {
    case 'affluenza':
      return 'bg-amber-100 text-amber-900'
    case 'voti_lista':
      return 'bg-blue-100 text-blue-900'
    case 'preferenze':
      return 'bg-violet-100 text-violet-900'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function LiveAggiornamentiPage({
  electionId,
  electionName,
  commune,
}: {
  electionId: number
  electionName: string
  commune: string
}) {
  const [data, setData] = useState<UpdatesPayload | null>(null)
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/elections/${electionId}/updates`)
      if (res.ok) {
        setData(await res.json())
        setLastFetchAt(new Date())
      }
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
        Caricamento aggiornamenti…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 text-center text-red-600">
        Impossibile caricare gli aggiornamenti.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteTopNav
        crumbs={[
          { label: 'Home', href: '/' },
          { label: electionName, href: `/live/${electionId}` },
          { label: 'Aggiornamenti' },
        ]}
        contextLinks={[
          { label: 'Live', href: `/live/${electionId}` },
          { label: 'Preferenze', href: `/live/${electionId}/preferenze` },
          { label: 'Analisi', href: `/dashboard/${electionId}` },
        ]}
      />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aggiornamenti spoglio</h1>
          <p className="text-gray-600 text-sm mt-1">
            {commune} — ultimi salvataggi da inserimento sezione (affluenza, voti lista, preferenze) con utente e orario
            registrati nel database.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ultimo dato salvato (DB)</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {data.lastDataUpdateAt ? formatWhen(data.lastDataUpdateAt) : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Massimo tra <code className="text-[11px] bg-gray-100 px-1 rounded">SectionTurnout.updatedAt</code>,{' '}
              <code className="text-[11px] bg-gray-100 px-1 rounded">SectionListResult.updatedAt</code> e{' '}
              <code className="text-[11px] bg-gray-100 px-1 rounded">CandidatePreference.updatedAt</code>.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ultimo aggiornamento ricevuto (pagina)</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {lastFetchAt ? formatWhen(lastFetchAt.toISOString()) : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Orario dell&apos;ultimo caricamento di questa pagina (anche via stream live o polling ogni 30 s). Non è un dato
              di spoglio.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Un singolo salvataggio in sezione può produrre più righe consecutive (affluenza + una per lista + preferenze). Le
          preferenze hanno tracciamento proprio da questa versione; i record più vecchi possono non avere{' '}
          <code className="bg-gray-100 px-1 rounded">enteredBy</code> sulle preferenze.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-900">Cronologia recente</h2>
            <span className="text-xs text-gray-500">{data.events.length} eventi</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50/80">
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Data/ora</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Sezione</th>
                  <th className="px-3 py-2 font-medium">Lista / candidato</th>
                  <th className="px-3 py-2 font-medium">Dettaglio</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Da</th>
                </tr>
              </thead>
              <tbody>
                {data.events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                      Nessun aggiornamento registrato.
                    </td>
                  </tr>
                ) : (
                  data.events.map((ev, i) => (
                    <tr key={`${ev.at}-${ev.kind}-${i}`} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700 tabular-nums">{formatWhen(ev.at)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${kindBadgeClass(ev.kind)}`}
                        >
                          {kindLabel(ev.kind)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        Sez. {ev.sectionNumber}
                        {ev.sectionName ? (
                          <span className="text-gray-500 text-xs block truncate max-w-[10rem]">{ev.sectionName}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-800">
                        {ev.listName ? <span className="block">{ev.listName}</span> : <span className="text-gray-400">—</span>}
                        {ev.candidateName ? (
                          <span className="text-xs text-gray-600 block">{ev.candidateName}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{ev.detail ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-800 whitespace-nowrap font-mono text-xs">
                        {ev.by ?? <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-6">
          <Link href={`/live/${electionId}`} className="text-blue-600 hover:underline">
            ← Torna alla live
          </Link>
        </p>
      </div>
    </div>
  )
}
