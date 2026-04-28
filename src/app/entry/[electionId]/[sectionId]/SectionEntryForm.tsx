'use client'

import { useEffect, useRef, useState } from 'react'

interface Candidate { id: number; firstName: string; lastName: string; order: number }
interface ListData { id: number; name: string; color: string; candidateMayor: string | null; candidates: Candidate[] }
interface ListResult { listId: number; listVotes: number; preferences: { candidateId: number; votes: number }[] }

interface Props {
  electionId: number
  sectionId: number
  lists: ListData[]
  existingTurnout: { votersActual: number; ballotsValid?: number; ballotsNull?: number; ballotsBlank?: number } | null
  existingListResults: ListResult[]
  theoreticalVoters: number
  /** Solo per ruolo entry: sezione bloccata dall’admin */
  readOnly?: boolean
}

export default function SectionEntryForm({
  electionId,
  sectionId,
  lists,
  existingTurnout,
  existingListResults,
  theoreticalVoters,
  readOnly = false,
}: Props) {
  const [turnout, setTurnout] = useState({
    votersActual: existingTurnout?.votersActual !== undefined ? String(existingTurnout.votersActual) : '',
    ballotsValid: existingTurnout?.ballotsValid !== undefined ? String(existingTurnout.ballotsValid) : '',
    ballotsNull:  existingTurnout?.ballotsNull  !== undefined ? String(existingTurnout.ballotsNull)  : '',
    ballotsBlank: existingTurnout?.ballotsBlank !== undefined ? String(existingTurnout.ballotsBlank) : '',
  })

  const [listVotes, setListVotes] = useState<Record<number, string>>(
    Object.fromEntries(lists.map(l => {
      const existing = existingListResults.find(r => r.listId === l.id)?.listVotes
      return [l.id, existing !== undefined ? String(existing) : '']
    }))
  )

  const [preferences, setPreferences] = useState<Record<number, Record<number, string>>>(
    Object.fromEntries(lists.map(l => [
      l.id,
      Object.fromEntries(l.candidates.map(c => {
        const existing = existingListResults.find(r => r.listId === l.id)?.preferences.find(p => p.candidateId === c.id)?.votes
        return [c.id, existing !== undefined ? String(existing) : '']
      })),
    ]))
  )

  const [showPrefs, setShowPrefs] = useState<Record<number, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const firstRenderRef = useRef(true)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef(false)
  const needsResaveRef = useRef(false)

  function setTurn(k: string, v: string) { setTurnout(t => ({ ...t, [k]: v })) }
  function setListVote(listId: number, value: string) {
    setListVotes(m => ({ ...m, [listId]: value }))
  }
  function setPreference(listId: number, candidateId: number, value: string) {
    setPreferences(m => ({
      ...m,
      [listId]: { ...(m[listId] || {}), [candidateId]: value },
    }))
  }
  function incrementPreference(listId: number, candidateId: number) {
    const current = Number(preferences[listId]?.[candidateId]) || 0
    setPreference(listId, candidateId, String(current + 1))
  }
  function incrementListVote(listId: number) {
    const current = Number(listVotes[listId]) || 0
    setListVote(listId, String(current + 1))
  }

  const totalListVotes = Object.values(listVotes).reduce((s, v) => s + (Number(v) || 0), 0)
  const actualVoters   = Number(turnout.votersActual) || 0
  const validBallots   = Number(turnout.ballotsValid) || 0

  function buildPayload() {
    return {
      turnout: {
        votersActual: Number(turnout.votersActual) || 0,
        ...(turnout.ballotsValid !== '' && { ballotsValid: Number(turnout.ballotsValid) }),
        ...(turnout.ballotsNull  !== '' && { ballotsNull:  Number(turnout.ballotsNull)  }),
        ...(turnout.ballotsBlank !== '' && { ballotsBlank: Number(turnout.ballotsBlank) }),
      },
      lists: lists.map(l => ({
        listId:    l.id,
        listVotes: Number(listVotes[l.id]) || 0,
        preferences: l.candidates
          .filter(c => preferences[l.id]?.[c.id] !== '' && preferences[l.id]?.[c.id] !== undefined)
          .map(c => ({ candidateId: c.id, votes: Number(preferences[l.id]?.[c.id]) || 0 })),
      })),
    }
  }

  async function persistData() {
    if (readOnly) return
    if (inFlightRef.current) {
      needsResaveRef.current = true
      return
    }
    inFlightRef.current = true
    setSaving(true)
    setError('')

    const res = await fetch(`/api/elections/${electionId}/results/section/${sectionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    })

    if (res.ok) {
      setLastSavedAt(new Date())
      setDirty(false)
    } else {
      const d = await res.json()
      setError(d.error || 'Errore nel salvataggio')
    }

    inFlightRef.current = false
    setSaving(false)
    if (needsResaveRef.current) {
      needsResaveRef.current = false
      void persistData()
    }
  }

  useEffect(() => {
    if (readOnly) return
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    setDirty(true)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      void persistData()
    }, 500)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [turnout, listVotes, preferences, readOnly])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  function saveStatusText() {
    if (readOnly) return 'Sola lettura'
    if (saving) return 'Salvataggio automatico...'
    if (error) return 'Errore di salvataggio'
    if (dirty) return 'Modifiche in attesa di salvataggio...'
    if (lastSavedAt) return `Salvato alle ${lastSavedAt.toLocaleTimeString('it-IT')}`
    return 'Nessuna modifica'
  }

  return (
    <div className="space-y-6">
      {/* Affluenza */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Affluenza</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Votanti reali *
              {actualVoters > 0 && theoreticalVoters > 0 && (
                <span className="text-xs font-normal text-blue-600 ml-1">
                  ({((actualVoters / theoreticalVoters) * 100).toFixed(1)}%)
                </span>
              )}
            </label>
            <input
              type="number" min="0" value={turnout.votersActual}
              onChange={e => setTurn('votersActual', e.target.value)}
              disabled={readOnly}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="0" required
            />
          </div>
          {[['Schede valide', 'ballotsValid'], ['Schede nulle', 'ballotsNull'], ['Schede bianche', 'ballotsBlank']].map(([label, key]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type="number" min="0" value={(turnout as Record<string, string | number>)[key]}
                onChange={e => setTurn(key, e.target.value)}
                disabled={readOnly}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="—" />
            </div>
          ))}
        </div>
        {validBallots > 0 && totalListVotes > 0 && (
          <div className={`mt-3 text-sm rounded-lg px-3 py-2 ${Math.abs(validBallots - totalListVotes) <= 2 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            Totale voti di lista: <strong>{totalListVotes.toLocaleString('it-IT')}</strong> su {validBallots.toLocaleString('it-IT')} schede valide
            {' '}({Math.abs(validBallots - totalListVotes) > 0 ? `differenza: ${validBallots - totalListVotes}` : '✓ quadratura corretta'})
          </div>
        )}
      </div>

      {/* Voti per lista */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Voti di lista</h3>
          {totalListVotes > 0 && (
            <span className="text-sm text-gray-500">Totale: <strong className="text-gray-900">{totalListVotes.toLocaleString('it-IT')}</strong></span>
          )}
        </div>
        <div className="space-y-3">
          {lists.map(list => {
            const v = Number(listVotes[list.id]) || 0
            const total = validBallots || totalListVotes
            const pct = total > 0 ? (v / total) * 100 : 0

            return (
              <div key={list.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="font-medium text-sm text-gray-800">{list.name}</span>
                        {list.candidateMayor && <span className="text-xs text-gray-400 ml-2">{list.candidateMayor}</span>}
                      </div>
                      {v > 0 && <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>}
                    </div>
                    {v > 0 && (
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: list.color }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => incrementListVote(list.id)}
                      disabled={readOnly}
                      className="w-7 h-7 rounded border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                      aria-label={`Aumenta voti di lista per ${list.name}`}
                    >
                      +
                    </button>
                    <input
                      type="number" min="0" value={listVotes[list.id]}
                      onChange={e => setListVote(list.id, e.target.value)}
                      disabled={readOnly}
                      className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-right font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Preferences toggle */}
                {list.candidates.length > 0 && (
                  <div className="mt-2">
                    <button type="button" onClick={() => setShowPrefs(m => ({ ...m, [list.id]: !m[list.id] }))}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                      {showPrefs[list.id] ? '▲ Nascondi preferenze' : '▼ Preferenze candidati'}
                    </button>
                    {showPrefs[list.id] && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {list.candidates.map(c => (
                          <div key={c.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                            <span className="text-xs text-gray-700 flex-1">{c.order}. {c.lastName} {c.firstName}</span>
                            <button
                              type="button"
                              onClick={() => incrementPreference(list.id, c.id)}
                              disabled={readOnly}
                              className="w-7 h-7 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                              aria-label={`Aumenta preferenze per ${c.lastName} ${c.firstName}`}
                            >
                              +
                            </button>
                            <input
                              type="number" min="0" value={preferences[list.id]?.[c.id] ?? ''}
                              onChange={e => setPreference(list.id, c.id, e.target.value)}
                              disabled={readOnly}
                              className="w-20 border border-gray-200 rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className={`rounded-lg px-4 py-3 text-sm font-medium ${error ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
        {saveStatusText()}
      </div>
      {error && <div className="bg-red-50   text-red-700   rounded-lg px-4 py-3">{error}</div>}

      <div className="flex gap-3">
        <a href={`/entry/${electionId}`}
          className="px-6 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium">
          ← Torna alle sezioni
        </a>
      </div>
    </div>
  )
}
