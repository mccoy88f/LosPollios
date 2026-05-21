'use client'

import { useEffect, useRef, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Card, CardBody, CardTitle } from '@/components/ui/Card'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { buttonClassName } from '@/components/ui/buttonStyles'
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
  className?: string
}

export default function SectionEntryForm({
  electionId,
  sectionId,
  lists,
  existingTurnout,
  existingListResults,
  theoreticalVoters,
  readOnly = false,
  className,
}: Props) {
  const hadTurnout = existingTurnout?.votersActual !== undefined && existingTurnout.votersActual > 0

  const [turnout, setTurnout] = useState({
    votersActual: existingTurnout?.votersActual !== undefined ? String(existingTurnout.votersActual) : '',
    ballotsValid: existingTurnout?.ballotsValid !== undefined ? String(existingTurnout.ballotsValid) : '',
    ballotsNull:  existingTurnout?.ballotsNull  !== undefined ? String(existingTurnout.ballotsNull)  : '',
    ballotsBlank: existingTurnout?.ballotsBlank !== undefined ? String(existingTurnout.ballotsBlank) : '',
  })

  const [listsPhase, setListsPhase] = useState(hadTurnout)
  const [affluenzaExpanded, setAffluenzaExpanded] = useState(!hadTurnout)

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

  /** Apre questa lista e chiude le altre; se già aperta non fa nulla. */
  function openList(listId: number) {
    setOpenListId(prev => (prev === listId ? prev : listId))
  }

  /** Tap sulla riga: apre o chiude; una sola aperta alla volta. */
  function toggleList(listId: number) {
    setOpenListId(prev => (prev === listId ? null : listId))
  }

  function setListVote(listId: number, value: string, options?: { open?: boolean }) {
    if (options?.open !== false) openList(listId)
    setListVotes(m => ({ ...m, [listId]: value }))
  }

  function setPreference(listId: number, candidateId: number, value: string) {
    openList(listId)
    setPreferences(m => ({ ...m, [listId]: { ...(m[listId] || {}), [candidateId]: value } }))
  }

  function continueToLists() {
    if (turnout.votersActual === '' || Number(turnout.votersActual) < 0) return
    setListsPhase(true)
    setAffluenzaExpanded(false)
    // Liste tutte chiuse: l’operatore apre quella che serve (tap o +/−)
  }

  function expandAffluenza() {
    setAffluenzaExpanded(true)
  }

  const totalListVotes = Object.values(listVotes).reduce((s, v) => s + (Number(v) || 0), 0)
  const actualVoters   = Number(turnout.votersActual) || 0
  const validBallots   = Number(turnout.ballotsValid) || 0
  const canContinue    = turnout.votersActual !== '' && Number(turnout.votersActual) >= 0

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

  const quadraturaAlert =
    validBallots > 0 && totalListVotes > 0 ? (
      <Alert
        variant={Math.abs(validBallots - totalListVotes) <= 2 ? 'success' : 'warning'}
        title="Quadratura voti lista"
      >
        Totale voti di lista: <strong className="tabular-nums">{totalListVotes.toLocaleString('it-IT')}</strong> su{' '}
        <strong className="tabular-nums">{validBallots.toLocaleString('it-IT')}</strong> schede valide
        {Math.abs(validBallots - totalListVotes) > 0 && (
          <> (differenza: <span className="tabular-nums">{validBallots - totalListVotes}</span>)</>
        )}
      </Alert>
    ) : null

  return (
    <div className={cn('flex flex-col flex-1 min-h-0 gap-3', className)}>
      {/* Affluenza: espansa prima del passaggio alle liste */}
      {!listsPhase || affluenzaExpanded ? (
        <Card className="shrink-0">
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
            {!listsPhase && (
              <button
                type="button"
                disabled={readOnly || !canContinue}
                onClick={continueToLists}
                className={buttonClassName('primary', 'md', 'w-full mt-4')}
              >
                Continua ai voti di lista
              </button>
            )}
            {listsPhase && affluenzaExpanded && (
              <button
                type="button"
                onClick={() => setAffluenzaExpanded(false)}
                className={buttonClassName('secondary', 'sm', 'mt-4')}
              >
                Chiudi affluenza
              </button>
            )}
            {!listsPhase && quadraturaAlert && <div className="mt-4">{quadraturaAlert}</div>}
          </CardBody>
        </Card>
      ) : (
        <button
          type="button"
          onClick={expandAffluenza}
          className="shrink-0 w-full text-left rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm hover:bg-brand-100/80 transition-colors"
        >
          <span className="text-brand-950">
            Affluenza: <strong className="tabular-nums">{actualVoters.toLocaleString('it-IT')}</strong> votanti
          </span>
          <span className="text-brand-700/80 ml-2 text-xs">· tocca per modificare</span>
        </button>
      )}

      {/* Voti lista: layout a tutta altezza come demo */}
      {listsPhase && !affluenzaExpanded && (
        <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
          <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-1">
            <h2 className="font-semibold text-gray-900 text-base">Voti di lista</h2>
            {totalListVotes > 0 && (
              <span className="text-sm text-gray-500 tabular-nums">
                Totale: <strong className="text-gray-900">{totalListVotes.toLocaleString('it-IT')}</strong>
              </span>
            )}
          </div>

          {quadraturaAlert && <div className="shrink-0 px-4 pb-2">{quadraturaAlert}</div>}

          <div
            className="flex flex-col flex-1 min-h-0 gap-2 px-3 pb-3 overflow-hidden"
            role="region"
            aria-label="Liste elettorali"
          >
            {lists.map(list => {
              const v = Number(listVotes[list.id]) || 0
              const total = validBallots || totalListVotes
              const pct = total > 0 ? (v / total) * 100 : 0
              const isOpen = openListId === list.id
              const hasCandidates = list.candidates.length > 0

              return (
                <article
                  key={list.id}
                  id={`list-panel-${list.id}`}
                  className={cn(
                    'flex flex-col shrink-0 rounded-xl border bg-white overflow-hidden min-h-0 transition-shadow',
                    isOpen
                      ? 'flex-1 min-h-0 border-accent-300 shadow-md ring-1 ring-accent-100'
                      : 'border-gray-200'
                  )}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-controls={hasCandidates ? `candidates-${list.id}` : undefined}
                    className="shrink-0 flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                    onClick={e => {
                      if ((e.target as HTMLElement).closest('[data-list-votes]')) return
                      toggleList(list.id)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleList(list.id)
                      }
                    }}
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
                    <div className="flex-1 min-w-0">
                      <span className="block font-semibold text-sm text-gray-900 truncate">{list.name}</span>
                      {list.candidateMayor && (
                        <span className="block text-xs text-gray-500 truncate">Sindaco: {list.candidateMayor}</span>
                      )}
                      {v > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: list.color }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums shrink-0">{pct.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                    <div data-list-votes className="shrink-0" onClick={e => e.stopPropagation()}>
                      <NumberStepper
                        value={listVotes[list.id] ?? ''}
                        onChange={val => setListVote(list.id, val)}
                        onActivate={() => openList(list.id)}
                        disabled={readOnly}
                        tone="brand"
                        aria-label={`Voti lista ${list.name}`}
                      />
                    </div>
                    {hasCandidates && (
                      <ChevronDown
                        className={cn('w-5 h-5 shrink-0 text-accent-600 transition-transform', isOpen && 'rotate-180')}
                        aria-hidden
                      />
                    )}
                  </div>

                  {hasCandidates && isOpen && (
                    <div
                      id={`candidates-${list.id}`}
                      className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-accent-50/50 border-t border-accent-100"
                      role="region"
                      aria-label={`Preferenze ${list.name}`}
                    >
                      {list.candidates.map(c => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between gap-3 px-3 py-3 border-b border-accent-100/80 last:border-0"
                        >
                          <p className="flex-1 min-w-0 text-sm leading-snug text-gray-800">
                            <span className="text-gray-500 tabular-nums">{c.order}.</span>{' '}
                            <strong className="font-semibold text-gray-900">{c.lastName}</strong>{' '}
                            {c.firstName}
                          </p>
                          <NumberStepper
                            value={preferences[list.id]?.[c.id] ?? ''}
                            onChange={val => setPreference(list.id, c.id, val)}
                            onActivate={() => openList(list.id)}
                            disabled={readOnly}
                            tone="accent"
                            inputClassName="w-16 text-sm"
                            className="shrink-0"
                            aria-label={`Preferenze ${c.lastName} ${c.firstName}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
          <p className="shrink-0 px-4 pb-2 text-[11px] text-center text-gray-500">
            Tap sulla lista o usa +/− per aprire a tutta altezza · un’altra lista si chiude da sola
          </p>
        </div>
      )}

      <Alert variant={saveVariant()} title="Stato dati" className="shrink-0">
        {saveMessage()}
      </Alert>

      <Link
        href={`/entry/${electionId}`}
        className={cn(
          'shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-medium rounded-lg',
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors'
        )}
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Torna alle sezioni
      </Link>
    </div>
  )
}
