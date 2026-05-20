'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Card, CardBody, CardTitle } from '@/components/ui/Card'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { cn } from '@/lib/cn'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import Link from 'next/link'

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

  const [openListId, setOpenListId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [dirty, setDirty] = useState(false)
  const firstRenderRef = useRef(true)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef(false)
  const needsResaveRef = useRef(false)

  function setTurn(k: string, v: string) { setTurnout(t => ({ ...t, [k]: v })) }
  function setListVote(listId: number, value: string) { setListVotes(m => ({ ...m, [listId]: value })) }
  function setPreference(listId: number, candidateId: number, value: string) {
    setPreferences(m => ({ ...m, [listId]: { ...(m[listId] || {}), [candidateId]: value } }))
  }

  function togglePreferences(listId: number) {
    if (openListId === listId) {
      setOpenListId(null)
      return
    }
    setOpenListId(listId)
    requestAnimationFrame(() => {
      document.getElementById(`list-panel-${listId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
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
    saveTimeoutRef.current = setTimeout(() => { void persistData() }, 500)
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [turnout, listVotes, preferences, readOnly])

  useEffect(() => () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }, [])

  function saveVariant(): 'info' | 'success' | 'warning' | 'error' {
    if (error) return 'error'
    if (readOnly) return 'info'
    if (saving || dirty) return 'info'
    if (lastSavedAt) return 'success'
    return 'info'
  }

  function saveMessage() {
    if (readOnly) return 'Sola lettura — la sezione è chiusa dall\'amministratore.'
    if (saving) return 'Salvataggio automatico in corso…'
    if (error) return error
    if (dirty) return 'Modifiche in attesa di salvataggio…'
    if (lastSavedAt) return `Ultimo salvataggio alle ${lastSavedAt.toLocaleTimeString('it-IT')}`
    return 'Nessuna modifica registrata.'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <CardTitle className="mb-4">Affluenza</CardTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Votanti reali *
                {actualVoters > 0 && theoreticalVoters > 0 && (
                  <span className="text-xs font-normal text-brand-600 ml-1 tabular-nums">
                    ({((actualVoters / theoreticalVoters) * 100).toFixed(1)}%)
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                value={turnout.votersActual}
                onChange={e => setTurn('votersActual', e.target.value)}
                disabled={readOnly}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 text-lg font-semibold tabular-nums disabled:bg-gray-100"
                placeholder="0"
                required
              />
            </div>
            {[['Schede valide', 'ballotsValid'], ['Schede nulle', 'ballotsNull'], ['Schede bianche', 'ballotsBlank']].map(([label, key]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type="number"
                  min="0"
                  value={(turnout as Record<string, string>)[key]}
                  onChange={e => setTurn(key, e.target.value)}
                  disabled={readOnly}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 tabular-nums disabled:bg-gray-100"
                  placeholder="—"
                />
              </div>
            ))}
          </div>
          {validBallots > 0 && totalListVotes > 0 && (
            <Alert
              variant={Math.abs(validBallots - totalListVotes) <= 2 ? 'success' : 'warning'}
              className="mt-4"
              title="Quadratura voti lista"
            >
              Totale voti di lista: <strong className="tabular-nums">{totalListVotes.toLocaleString('it-IT')}</strong> su{' '}
              <strong className="tabular-nums">{validBallots.toLocaleString('it-IT')}</strong> schede valide
              {Math.abs(validBallots - totalListVotes) > 0 && (
                <> (differenza: <span className="tabular-nums">{validBallots - totalListVotes}</span>)</>
              )}
            </Alert>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Voti di lista</CardTitle>
            {totalListVotes > 0 && (
              <span className="text-sm text-gray-500 tabular-nums">
                Totale: <strong className="text-gray-900">{totalListVotes.toLocaleString('it-IT')}</strong>
              </span>
            )}
          </div>
          <div className={cn('space-y-3', openListId != null && 'relative')}>
            {lists.map(list => {
              const v = Number(listVotes[list.id]) || 0
              const total = validBallots || totalListVotes
              const pct = total > 0 ? (v / total) * 100 : 0
              const isOpen = openListId === list.id
              const dimOthers = openListId != null && !isOpen

              return (
                <div
                  key={list.id}
                  id={`list-panel-${list.id}`}
                  className={cn(
                    'border rounded-xl p-3 transition-all',
                    isOpen ? 'border-indigo-300 shadow-md ring-1 ring-indigo-100 z-10 bg-white' : 'border-gray-100',
                    dimOthers && 'opacity-50 pointer-events-none'
                  )}
                >
                  <div className={cn('flex items-center gap-3', isOpen && 'sticky top-0 z-10 bg-white pb-2')}>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <span className="font-medium text-sm text-gray-800">{list.name}</span>
                          {list.candidateMayor && (
                            <span className="text-xs text-gray-400 ml-2 hidden sm:inline">{list.candidateMayor}</span>
                          )}
                        </div>
                        {v > 0 && <span className="text-xs text-gray-500 tabular-nums shrink-0">{pct.toFixed(1)}%</span>}
                      </div>
                      {v > 0 && (
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: list.color }}
                          />
                        </div>
                      )}
                    </div>
                    <NumberStepper
                      value={listVotes[list.id] ?? ''}
                      onChange={val => setListVote(list.id, val)}
                      disabled={readOnly}
                      tone="brand"
                      aria-label={`Voti lista ${list.name}`}
                    />
                  </div>

                  {list.candidates.length > 0 && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => togglePreferences(list.id)}
                        className="inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900 font-medium"
                        aria-expanded={isOpen}
                      >
                        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
                        Preferenze candidati
                      </button>
                      {isOpen && (
                        <div className="mt-2 max-h-[min(55vh,22rem)] overflow-y-auto overscroll-contain border-t border-indigo-100 pt-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {list.candidates.map(c => (
                              <div
                                key={c.id}
                                className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2"
                              >
                                <span className="text-xs text-gray-700 flex-1 min-w-[8rem]">
                                  {c.order}. {c.lastName} {c.firstName}
                                </span>
                                <NumberStepper
                                  value={preferences[list.id]?.[c.id] ?? ''}
                                  onChange={val => setPreference(list.id, c.id, val)}
                                  disabled={readOnly}
                                  tone="indigo"
                                  inputClassName="w-16 text-xs"
                                  className="shrink-0"
                                  aria-label={`Preferenze ${c.lastName} ${c.firstName}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      <Alert variant={saveVariant()} title="Stato dati">
        {saveMessage()}
      </Alert>

      <Link
        href={`/entry/${electionId}`}
        className="inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Torna alle sezioni
      </Link>
    </div>
  )
}
