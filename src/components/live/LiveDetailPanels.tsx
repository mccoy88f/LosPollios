'use client'

import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { formatNumber, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/cn'
import type { LiveListResult } from '@/components/live/liveTypes'

export function LivePanelClose({ onClose, label = 'Chiudi' }: { onClose: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="inline-flex items-center gap-1 text-sm text-brand-800 hover:underline font-medium"
    >
      <X className="w-4 h-4" aria-hidden />
      {label}
    </button>
  )
}

export function LiveListPreferencesDetail({
  list,
  onClose,
}: {
  list: LiveListResult
  onClose: () => void
}) {
  const sorted = [...list.candidates].sort((a, b) => b.votes - a.votes)
  const prefTotal = sorted.reduce((s, c) => s + c.votes, 0)

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          Preferenze · {list.listName}
        </h4>
        <LivePanelClose onClose={onClose} />
      </div>
      <p className="text-xs text-gray-500 mb-2 tabular-nums">
        Voti lista: {formatNumber(list.votes)}
        {prefTotal > 0 && ` · Σ preferenze: ${formatNumber(prefTotal)}`}
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500">Nessuna preferenza registrata.</p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {sorted.map((c, i) => {
            const pct = list.votes > 0 ? (c.votes / list.votes) * 100 : 0
            return (
              <div
                key={c.candidateId}
                className="flex items-center justify-between gap-2 text-sm bg-brand-50/50 rounded-lg px-3 py-2"
              >
                <span className="text-gray-400 w-5 tabular-nums shrink-0">{i + 1}.</span>
                <span className="text-gray-900 truncate flex-1 font-medium">{c.name}</span>
                <span className="text-xs text-gray-500 tabular-nums shrink-0">{pct.toFixed(1)}%</span>
                <span className="font-semibold text-gray-900 tabular-nums shrink-0 w-16 text-right">
                  {formatNumber(c.votes)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

type SectionDetailPayload = {
  section: { id: number; number: number; name: string | null; locked: boolean; theoreticalVoters: number }
  turnout: {
    votersActual: number
    ballotsValid: number | null
    ballotsNull: number | null
    ballotsBlank: number | null
  } | null
  turnoutPct: number | null
  listVotesSum: number
  sectionWarnings: string[]
  lists: {
    listId: number
    listName: string
    color: string
    listVotes: number
    candidates: { candidateId: number; name: string; votes: number }[]
  }[]
  hasData: boolean
}

export function LiveSectionDetailPanel({
  electionId,
  sectionId,
  sectionNumber,
  onClose,
}: {
  electionId: number
  sectionId: number
  sectionNumber: number
  onClose: () => void
}) {
  const [data, setData] = useState<SectionDetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/elections/${electionId}/live/section/${sectionId}`)
      .then(async res => {
        if (!res.ok) throw new Error('Errore caricamento')
        return res.json() as Promise<SectionDetailPayload>
      })
      .then(json => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        if (!cancelled) setError('Impossibile caricare il resoconto sezione.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [electionId, sectionId])

  const listTotal = data?.lists.reduce((s, l) => s + l.listVotes, 0) ?? 0

  return (
    <div className="bg-white rounded-xl border-2 border-brand-800/20 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Sezione {sectionNumber}</h3>
          {data?.section.name && <p className="text-sm text-gray-500">{data.section.name}</p>}
        </div>
        <LivePanelClose onClose={onClose} />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 py-6 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
          Caricamento…
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && !loading && (
        <div className="space-y-4">
          {!data.hasData ? (
            <p className="text-sm text-gray-500">Nessun dato inserito per questa sezione.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Aventi diritto" value={formatNumber(data.section.theoreticalVoters)} />
                <Stat
                  label="Votanti"
                  value={data.turnout ? formatNumber(data.turnout.votersActual) : '—'}
                  sub={data.turnoutPct != null ? formatPercent(data.turnoutPct) : undefined}
                />
                <Stat
                  label="Schede valide"
                  value={
                    data.turnout?.ballotsValid != null ? formatNumber(data.turnout.ballotsValid) : '—'
                  }
                />
                <Stat label="Voti lista" value={formatNumber(listTotal)} />
              </div>

              {data.sectionWarnings.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 space-y-1">
                  {data.sectionWarnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}

              {data.lists.length > 0 ? (
                <div className="space-y-3">
                  {[...data.lists]
                    .sort((a, b) => b.listVotes - a.listVotes)
                    .map(list => (
                      <div key={list.listId} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: list.color }}
                            />
                            <span className="font-medium text-sm text-gray-900">{list.listName}</span>
                          </div>
                          <span className="font-bold text-sm tabular-nums">{formatNumber(list.listVotes)}</span>
                        </div>
                        {list.candidates.filter(c => c.votes > 0).length > 0 && (
                          <div className="space-y-0.5 pl-4 border-l-2 border-gray-100">
                            {list.candidates
                              .filter(c => c.votes > 0)
                              .map(c => (
                                <div
                                  key={c.candidateId}
                                  className="flex justify-between text-xs text-gray-600 gap-2"
                                >
                                  <span className="truncate">{c.name}</span>
                                  <span className="tabular-nums font-medium shrink-0">{formatNumber(c.votes)}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nessun voto lista registrato.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

type CandidateSectionsPayload = {
  candidate: { candidateId: number; name: string; listName: string; color: string }
  totalVotes: number
  sections: { sectionId: number; number: number; name: string | null; votes: number; listVotes: number }[]
}

export function LiveCandidateSectionsPanel({
  electionId,
  candidateId,
  candidateName,
  onClose,
}: {
  electionId: number
  candidateId: number
  candidateName: string
  onClose: () => void
}) {
  const [data, setData] = useState<CandidateSectionsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/elections/${electionId}/live/candidate/${candidateId}`)
      .then(async res => {
        if (!res.ok) throw new Error('Errore')
        return res.json() as Promise<CandidateSectionsPayload>
      })
      .then(json => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        if (!cancelled) setError('Impossibile caricare il dettaglio per sezione.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [electionId, candidateId])

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Preferenze per sezione · {candidateName}</h4>
        <LivePanelClose onClose={onClose} />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          <span className="text-sm">Caricamento…</span>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && !loading && (
        <>
          <p className="text-xs text-gray-500 mb-2 tabular-nums">
            Totale: {formatNumber(data.totalVotes)} · {data.sections.length} sezioni con preferenze
          </p>
          {data.sections.length === 0 ? (
            <p className="text-sm text-gray-500">Nessuna preferenza per sezione.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto">
              {data.sections.map(s => {
                const pct = s.listVotes > 0 ? (s.votes / s.listVotes) * 100 : 0
                return (
                  <div
                    key={s.sectionId}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-center"
                    title={s.name ?? undefined}
                  >
                    <div className="text-sm font-bold text-gray-900">{s.number}</div>
                    <div className="text-xs font-semibold text-gray-800 tabular-nums">{formatNumber(s.votes)}</div>
                    {pct > 0 && (
                      <div className="text-[10px] text-gray-500 tabular-nums">{pct.toFixed(0)}% lista</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-brand-800 font-medium">{sub}</p>}
    </div>
  )
}

export function liveSelectableRowClass(selected: boolean) {
  return cn(
    'cursor-pointer transition-colors rounded-lg -mx-1 px-1',
    selected ? 'bg-brand-50 ring-2 ring-brand-800/30' : 'hover:bg-gray-50'
  )
}
