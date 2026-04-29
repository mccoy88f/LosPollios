'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  downloadHistoricalElectionPrefillXlsx,
  downloadHistoricalExcelTemplate,
  historicalRowsToSemicolonLines,
  normalizeHistoricalRowsForCreate,
  parseHistoricalExcelFull,
} from '@/lib/historicalExcel'
import type { HistoricalCandidateRow, HistoricalParsedRow } from '@/lib/historicalExcel'
import type { EligendoAffluenza } from '@/lib/eligendoImport'
import { confirmElectionDeletionTwice } from '@/lib/confirmDelete'

function numToInput(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return ''
  return String(n)
}

interface HistCouncilCandidate {
  id: number
  firstName: string
  lastName: string
  order: number
  preferenceVotes: number
  personId: number | null
  person: { id: number; firstName: string; lastName: string } | null
}

interface HistResult {
  id: number
  listName: string
  coalition: string | null
  candidateMayor: string | null
  votes: number
  percentage: number
  seats: number | null
  mayorPersonId: number | null
  mayorPerson: { id: number; firstName: string; lastName: string } | null
  listLogoUrl?: string | null
  coalitionLogoUrl?: string | null
  notes?: string | null
  councilCandidates?: HistCouncilCandidate[]
}
interface HistElection {
  id: number
  name: string
  commune: string
  year: number
  notes: string | null
  registeredVoters?: number | null
  turnoutVoters?: number | null
  turnoutPercent?: number | null
  ballotsBlank?: number | null
  ballotsInvalidInclBlank?: number | null
  results: HistResult[]
}
interface PersonOpt { id: number; firstName: string; lastName: string }

/** Elezione operativa archiviata: stessi dati di spoglio modificabili da /admin/elections/[id] */
interface ArchivedOpElection {
  id: number
  name: string
  commune: string
  date: string
  status: string
  registeredVoters?: number | null
  turnoutVoters?: number | null
  turnoutPercent?: number | null
}

type RowDraft = {
  listName: string
  coalition: string
  candidateMayor: string
  votes: string
  percentage: string
  seats: string
  listLogoUrl: string
  coalitionLogoUrl: string
  notes: string
  mayorPersonId: string
}

function CouncilCandidatesEditor({
  listResultId,
  candidates,
  persons,
  listRowEditing,
  onReload,
  embedded,
}: {
  listResultId: number
  candidates: HistCouncilCandidate[]
  persons: PersonOpt[]
  /** true se la riga lista principale è in modifica (loghi/note) */
  listRowEditing: boolean
  onReload: () => void
  /** dentro scheda lista (senza bordo laterale) */
  embedded?: boolean
}) {
  const list = [...(candidates ?? [])].sort((a, b) => a.order - b.order || a.id - b.id)
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    order: '0',
    preferenceVotes: '0',
    personId: '',
  })
  const [editId, setEditId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<{
    firstName: string
    lastName: string
    order: string
    preferenceVotes: string
    personId: string
  } | null>(null)
  const [busy, setBusy] = useState(false)

  const locked = listRowEditing || busy

  function startEdit(c: HistCouncilCandidate) {
    setEditId(c.id)
    setEditDraft({
      firstName: c.firstName,
      lastName: c.lastName,
      order: String(c.order),
      preferenceVotes: String(c.preferenceVotes),
      personId: c.personId != null ? String(c.personId) : '',
    })
  }

  function cancelEdit() {
    setEditId(null)
    setEditDraft(null)
  }

  async function patchPerson(c: HistCouncilCandidate, personId: number | null) {
    if (editId === c.id) return
    setBusy(true)
    const res = await fetch(`/api/historical/council-candidates/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId }),
    })
    setBusy(false)
    if (res.ok) onReload()
  }

  async function addOne() {
    const fn = addForm.firstName.trim()
    const ln = addForm.lastName.trim()
    if (!fn || !ln) {
      window.alert('Inserire nome e cognome.')
      return
    }
    setBusy(true)
    const res = await fetch(`/api/historical/results/${listResultId}/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: fn,
        lastName: ln,
        order: parseInt(addForm.order, 10) || 0,
        preferenceVotes: parseInt(addForm.preferenceVotes, 10) || 0,
        personId: addForm.personId === '' ? null : parseInt(addForm.personId, 10),
      }),
    })
    setBusy(false)
    if (res.ok) {
      setAddForm({ firstName: '', lastName: '', order: '0', preferenceVotes: '0', personId: '' })
      onReload()
    } else {
      const d = await res.json().catch(() => ({}))
      window.alert(d.error || 'Salvataggio non riuscito')
    }
  }

  async function saveEdit() {
    if (!editId || !editDraft) return
    const fn = editDraft.firstName.trim()
    const ln = editDraft.lastName.trim()
    if (!fn || !ln) {
      window.alert('Nome e cognome obbligatori.')
      return
    }
    setBusy(true)
    const res = await fetch(`/api/historical/council-candidates/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: fn,
        lastName: ln,
        order: parseInt(editDraft.order, 10) || 0,
        preferenceVotes: parseInt(editDraft.preferenceVotes, 10) || 0,
        personId: editDraft.personId === '' ? null : parseInt(editDraft.personId, 10),
      }),
    })
    setBusy(false)
    if (res.ok) {
      cancelEdit()
      onReload()
    } else {
      const d = await res.json().catch(() => ({}))
      window.alert(d.error || 'Salvataggio non riuscito')
    }
  }

  async function remove(id: number) {
    if (!window.confirm('Eliminare questo candidato dallo storico?')) return
    setBusy(true)
    const res = await fetch(`/api/historical/council-candidates/${id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) {
      if (editId === id) cancelEdit()
      onReload()
    }
  }

  async function bumpPreference(c: HistCouncilCandidate) {
    if (locked) return
    setBusy(true)
    const res = await fetch(`/api/historical/council-candidates/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferenceVotes: c.preferenceVotes + 1 }),
    })
    setBusy(false)
    if (res.ok) onReload()
  }

  return (
    <div
      className={`space-y-2 py-1 ${embedded ? '' : 'pl-2 border-l-2 border-indigo-100'}`}
    >
      <p className="text-[11px] font-medium text-gray-600">
        Preferenze: usa il <strong>+</strong> per +1 come in inserimento sezione. I voti totali della lista sono sulla scheda
        sopra.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[520px]">
          <thead>
            <tr className="text-gray-500 text-left border-b border-gray-100">
              <th className="pb-1 pr-2 w-10">Ord.</th>
              <th className="pb-1 pr-2">Cognome</th>
              <th className="pb-1 pr-2">Nome</th>
              <th className="pb-1 pr-2 text-right">Preferenze</th>
              <th className="pb-1 pr-2 min-w-[140px]">Anagrafica</th>
              <th className="pb-1 text-right w-28">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-2 text-gray-400 italic">
                  Nessun candidato: aggiungi sotto.
                </td>
              </tr>
            ) : (
              list.map(c =>
                editId === c.id && editDraft ? (
                  <tr key={c.id} className="border-b border-gray-50 align-top">
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        value={editDraft.order}
                        onChange={ev =>
                          setEditDraft(d => d && { ...d, order: ev.target.value })
                        }
                        className="w-12 border border-gray-300 rounded px-1 py-0.5"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        value={editDraft.lastName}
                        onChange={ev =>
                          setEditDraft(d => d && { ...d, lastName: ev.target.value })
                        }
                        className="w-full min-w-[80px] border border-gray-300 rounded px-1 py-0.5"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        value={editDraft.firstName}
                        onChange={ev =>
                          setEditDraft(d => d && { ...d, firstName: ev.target.value })
                        }
                        className="w-full min-w-[80px] border border-gray-300 rounded px-1 py-0.5"
                      />
                    </td>
                    <td className="py-1 pr-2 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setEditDraft(d =>
                              d && {
                                ...d,
                                preferenceVotes: String(
                                  (parseInt(d.preferenceVotes, 10) || 0) + 1,
                                ),
                              },
                            )
                          }
                          className="w-6 h-6 rounded border border-indigo-200 text-indigo-700 text-xs hover:bg-indigo-50"
                          aria-label="Aumenta preferenze di 1"
                        >
                          +
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={editDraft.preferenceVotes}
                          onChange={ev =>
                            setEditDraft(d => d && { ...d, preferenceVotes: ev.target.value })
                          }
                          className="w-20 border border-gray-300 rounded px-1 py-0.5 text-right"
                        />
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        value={editDraft.personId}
                        onChange={ev =>
                          setEditDraft(d => d && { ...d, personId: ev.target.value })
                        }
                        className="max-w-[150px] border border-gray-200 rounded px-1 py-0.5 text-[11px]"
                      >
                        <option value="">—</option>
                        {persons.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.lastName} {p.firstName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => saveEdit()}
                        className="text-indigo-600 font-medium mr-2"
                      >
                        Salva
                      </button>
                      <button type="button" onClick={() => cancelEdit()} className="text-gray-500">
                        Annulla
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className="border-b border-gray-50 align-top">
                    <td className="py-1 pr-2 text-gray-600">{c.order}</td>
                    <td className="py-1 pr-2">{c.lastName}</td>
                    <td className="py-1 pr-2">{c.firstName}</td>
                    <td className="py-1 pr-2 text-right">
                      <div className="inline-flex items-center gap-1 justify-end w-full">
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => bumpPreference(c)}
                          className="w-6 h-6 rounded border border-indigo-200 text-indigo-700 text-xs hover:bg-indigo-50 disabled:opacity-40"
                          aria-label={`Aumenta preferenze per ${c.lastName}`}
                        >
                          +
                        </button>
                        <span className="tabular-nums">{c.preferenceVotes.toLocaleString('it-IT')}</span>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        value={c.personId ?? ''}
                        onChange={ev => {
                          const v = ev.target.value
                          void patchPerson(c, v ? parseInt(v, 10) : null)
                        }}
                        disabled={locked}
                        className="max-w-[150px] border border-gray-200 rounded px-1 py-0.5 text-[11px] disabled:opacity-50"
                      >
                        <option value="">—</option>
                        {persons.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.lastName} {p.firstName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => startEdit(c)}
                        className="text-indigo-600 font-medium text-[11px] disabled:opacity-40 mr-2"
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => remove(c.id)}
                        className="text-red-600 text-[11px] disabled:opacity-40"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 items-end pt-1 border-t border-gray-100/80">
        <div>
          <label className="block text-[10px] text-gray-500">Cognome</label>
          <input
            value={addForm.lastName}
            onChange={ev => setAddForm(f => ({ ...f, lastName: ev.target.value }))}
            disabled={locked}
            className="border border-gray-300 rounded px-2 py-1 text-xs w-32 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500">Nome</label>
          <input
            value={addForm.firstName}
            onChange={ev => setAddForm(f => ({ ...f, firstName: ev.target.value }))}
            disabled={locked}
            className="border border-gray-300 rounded px-2 py-1 text-xs w-28 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500">Ord.</label>
          <input
            type="number"
            value={addForm.order}
            onChange={ev => setAddForm(f => ({ ...f, order: ev.target.value }))}
            disabled={locked}
            className="border border-gray-300 rounded px-2 py-1 text-xs w-14 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500">Pref.</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                setAddForm(f => ({
                  ...f,
                  preferenceVotes: String((parseInt(f.preferenceVotes, 10) || 0) + 1),
                }))
              }
              className="w-6 h-6 rounded border border-indigo-200 text-indigo-700 text-xs hover:bg-indigo-50 disabled:opacity-50"
              aria-label="Aumenta preferenze di 1"
            >
              +
            </button>
            <input
              type="number"
              min={0}
              value={addForm.preferenceVotes}
              onChange={ev => setAddForm(f => ({ ...f, preferenceVotes: ev.target.value }))}
              disabled={locked}
              className="border border-gray-300 rounded px-2 py-1 text-xs w-20 disabled:opacity-50"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500">Anagrafica</label>
          <select
            value={addForm.personId}
            onChange={ev => setAddForm(f => ({ ...f, personId: ev.target.value }))}
            disabled={locked}
            className="border border-gray-200 rounded px-1 py-1 text-xs max-w-[140px] disabled:opacity-50"
          >
            <option value="">—</option>
            {persons.map(p => (
              <option key={p.id} value={p.id}>
                {p.lastName} {p.firstName}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={locked}
          onClick={() => addOne()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
        >
          Aggiungi candidato
        </button>
      </div>
    </div>
  )
}

function ExpandedHistoricalElection({
  election: e,
  persons,
  onReload,
  setPersons,
  onDeleted,
}: {
  election: HistElection
  persons: PersonOpt[]
  onReload: () => void
  setPersons: (p: PersonOpt[]) => void
  onDeleted: () => void
}) {
  const [meta, setMeta] = useState({
    name: e.name,
    commune: e.commune,
    year: String(e.year),
    notes: e.notes || '',
    registeredVoters: numToInput(e.registeredVoters),
    turnoutVoters: numToInput(e.turnoutVoters),
    turnoutPercent: numToInput(e.turnoutPercent),
    ballotsBlank: numToInput(e.ballotsBlank),
    ballotsInvalidInclBlank: numToInput(e.ballotsInvalidInclBlank),
  })
  const [metaSaving, setMetaSaving] = useState(false)
  const [editingRowId, setEditingRowId] = useState<number | null>(null)
  const [rowDraft, setRowDraft] = useState<RowDraft | null>(null)
  const [expandCouncilId, setExpandCouncilId] = useState<number | null>(null)
  const [mergeBusy, setMergeBusy] = useState(false)
  const [listAddBusy, setListAddBusy] = useState(false)
  const mergeFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMeta({
      name: e.name,
      commune: e.commune,
      year: String(e.year),
      notes: e.notes || '',
      registeredVoters: numToInput(e.registeredVoters),
      turnoutVoters: numToInput(e.turnoutVoters),
      turnoutPercent: numToInput(e.turnoutPercent),
      ballotsBlank: numToInput(e.ballotsBlank),
      ballotsInvalidInclBlank: numToInput(e.ballotsInvalidInclBlank),
    })
  }, [
    e.id,
    e.name,
    e.commune,
    e.year,
    e.notes,
    e.registeredVoters,
    e.turnoutVoters,
    e.turnoutPercent,
    e.ballotsBlank,
    e.ballotsInvalidInclBlank,
  ])

  function startEditRow(r: HistResult) {
    setEditingRowId(r.id)
    setRowDraft({
      listName: r.listName,
      coalition: r.coalition || '',
      candidateMayor: r.candidateMayor || '',
      votes: String(r.votes),
      percentage: String(r.percentage),
      seats: r.seats != null ? String(r.seats) : '',
      listLogoUrl: r.listLogoUrl || '',
      coalitionLogoUrl: r.coalitionLogoUrl || '',
      notes: r.notes || '',
      mayorPersonId: r.mayorPersonId != null ? String(r.mayorPersonId) : '',
    })
  }

  function cancelEditRow() {
    setEditingRowId(null)
    setRowDraft(null)
  }

  async function saveMeta() {
    setMetaSaving(true)
    const res = await fetch(`/api/historical/${e.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: meta.name.trim(),
        commune: meta.commune.trim(),
        year: parseInt(meta.year, 10),
        notes: meta.notes.trim() || null,
        registeredVoters: meta.registeredVoters.trim() === '' ? null : parseInt(meta.registeredVoters, 10),
        turnoutVoters: meta.turnoutVoters.trim() === '' ? null : parseInt(meta.turnoutVoters, 10),
        turnoutPercent:
          meta.turnoutPercent.trim() === ''
            ? null
            : parseFloat(meta.turnoutPercent.replace(',', '.')),
        ballotsBlank: meta.ballotsBlank.trim() === '' ? null : parseInt(meta.ballotsBlank, 10),
        ballotsInvalidInclBlank:
          meta.ballotsInvalidInclBlank.trim() === ''
            ? null
            : parseInt(meta.ballotsInvalidInclBlank, 10),
      }),
    })
    setMetaSaving(false)
    if (res.ok) onReload()
  }

  async function saveRow() {
    if (!editingRowId || !rowDraft) return
    const res = await fetch(`/api/historical/results/${editingRowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listName: rowDraft.listName.trim(),
        coalition: rowDraft.coalition.trim() || null,
        candidateMayor: rowDraft.candidateMayor.trim() || null,
        votes: parseInt(rowDraft.votes, 10) || 0,
        percentage: parseFloat(String(rowDraft.percentage).replace(',', '.')) || 0,
        seats: rowDraft.seats.trim() === '' ? null : parseInt(rowDraft.seats, 10),
        listLogoUrl: rowDraft.listLogoUrl.trim() || null,
        coalitionLogoUrl: rowDraft.coalitionLogoUrl.trim() || null,
        notes: rowDraft.notes.trim() || null,
        mayorPersonId: rowDraft.mayorPersonId === '' ? null : parseInt(rowDraft.mayorPersonId, 10),
      }),
    })
    if (res.ok) {
      cancelEditRow()
      onReload()
    }
  }

  async function patchMayor(r: HistResult, mayorPersonId: number | null) {
    await fetch(`/api/historical/results/${r.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mayorPersonId }),
    })
    onReload()
  }

  /** +1 voto di lista (come in inserimento sezione) */
  async function bumpListVotes(r: HistResult) {
    if (editingRowId != null) return
    const res = await fetch(`/api/historical/results/${r.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ votes: r.votes + 1 }),
    })
    if (res.ok) onReload()
  }

  async function deleteHistoricalElection() {
    const ok = confirmElectionDeletionTwice({
      title: `Eliminare l’elezione storica «${e.name}»?`,
      detail: `${e.commune} · ${e.year}. Verranno eliminate tutte le righe lista, i candidati al consiglio collegati e i dati di affluenza associati a questo record storico.`,
      finalPrompt: `Ultima conferma: eliminare definitivamente «${e.name}»? L’operazione non può essere annullata.`,
    })
    if (!ok) return
    const res = await fetch(`/api/historical/${e.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted()
    else {
      const d = await res.json().catch(() => ({}))
      window.alert(d.error || 'Eliminazione non riuscita')
    }
  }

  async function deleteListRow(r: HistResult) {
    if (!window.confirm(`Eliminare la lista «${r.listName}» dallo storico?`)) return
    const res = await fetch(`/api/historical/results/${r.id}`, { method: 'DELETE' })
    if (res.ok) {
      if (editingRowId === r.id) cancelEditRow()
      if (expandCouncilId === r.id) setExpandCouncilId(null)
      onReload()
    } else {
      const d = await res.json().catch(() => ({}))
      window.alert(d.error || 'Eliminazione lista non riuscita')
    }
  }

  async function suggestMayor(r: HistResult) {
    if (!r.candidateMayor?.trim()) return
    const res = await fetch(`/api/persons/suggestions?mayorLabel=${encodeURIComponent(r.candidateMayor)}`)
    const data = await res.json()
    if (data.persons?.length === 1) {
      await patchMayor(r, data.persons[0].id)
    } else if (!data.persons?.length) {
      const parts = r.candidateMayor.trim().split(/\s+/)
      const fn = parts[0]
      const ln = parts.slice(1).join(' ')
      if (!ln) {
        window.alert('Servono nome e cognome nel campo sindaco per creare l\'anagrafica.')
        return
      }
      if (!window.confirm(`Creare anagrafica ${fn} ${ln} e collegarla?`)) return
      const pr = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: fn, lastName: ln }),
      })
      const p = await pr.json()
      if (p.id) {
        await patchMayor(r, p.id)
        const prs = await fetch('/api/persons')
        setPersons(await prs.json())
      }
    } else {
      window.alert(`${data.persons.length} omonimi: scegli dal menu.`)
    }
  }

  function downloadPrefillCouncilXlsx() {
    downloadHistoricalElectionPrefillXlsx(
      { electionName: e.name, commune: e.commune, year: e.year },
      e.results.map(r => ({
        listName: r.listName,
        coalition: r.coalition,
        candidateMayor: r.candidateMayor,
        votes: r.votes,
        percentage: r.percentage,
        seats: r.seats,
      })),
      e.results.flatMap(r =>
        (r.councilCandidates ?? []).map(c => ({
          listName: r.listName,
          lastName: c.lastName,
          firstName: c.firstName,
          order: c.order,
          preferenceVotes: c.preferenceVotes,
        })),
      ),
    )
  }

  async function addListRow() {
    setListAddBusy(true)
    try {
      const res = await fetch(`/api/historical/${e.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const row = await res.json()
      if (!res.ok) {
        window.alert(row.error || 'Impossibile aggiungere la lista')
        return
      }
      onReload()
      setExpandCouncilId(null)
      startEditRow({
        id: row.id,
        listName: row.listName,
        coalition: row.coalition,
        candidateMayor: row.candidateMayor,
        votes: row.votes,
        percentage: row.percentage,
        seats: row.seats,
        mayorPersonId: row.mayorPersonId,
        mayorPerson: row.mayorPerson ?? null,
        listLogoUrl: row.listLogoUrl,
        coalitionLogoUrl: row.coalitionLogoUrl,
        notes: row.notes,
        councilCandidates: row.councilCandidates ?? [],
      })
    } finally {
      setListAddBusy(false)
    }
  }

  async function onMergeExcelFile(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    setMergeBusy(true)
    try {
      const buf = await f.arrayBuffer()
      const { lists, candidates } = parseHistoricalExcelFull(buf)
      if (!lists.length && !candidates.length) {
        window.alert('Nessun dato nel file (fogli «Risultati» e «Candidati» vuoti o non validi).')
        return
      }
      const res = await fetch(`/api/historical/${e.id}/merge-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lists: lists.length ? lists : undefined,
          candidates: candidates.length ? candidates : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data.error || 'Reimport non riuscito')
        return
      }
      onReload()
    } catch {
      window.alert('Impossibile leggere il file.')
    } finally {
      setMergeBusy(false)
      if (mergeFileRef.current) mergeFileRef.current.value = ''
    }
  }

  return (
    <div className="border-t border-gray-100 p-4 space-y-4">
      <p className="text-xs text-gray-600">
        Ogni lista è una scheda. Il pulsante <strong>+</strong> accanto a voti e preferenze aumenta il contatore di 1 (come
        in inserimento sezione). Per modifiche ampie usa <strong>Modifica lista</strong> o il pannello Candidati. Excel
        precompilato e reimport disponibili qui sotto.
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => downloadPrefillCouncilXlsx()}
          className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium"
        >
          Scarica Excel candidati (precompilato)
        </button>
        <input
          ref={mergeFileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={ev => onMergeExcelFile(ev.target.files)}
        />
        <button
          type="button"
          disabled={mergeBusy}
          onClick={() => mergeFileRef.current?.click()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium"
        >
          {mergeBusy ? 'Import…' : 'Reimporta Excel'}
        </button>
        <button
          type="button"
          disabled={listAddBusy || mergeBusy || editingRowId != null}
          onClick={() => addListRow()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium"
          title="Aggiunge una nuova lista nello spoglio con voti, percentuale e seggi (dati macro)"
        >
          {listAddBusy ? '…' : '+ Nuova riga voti lista'}
        </button>
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        <strong>+ Nuova riga voti lista</strong> (blu) aggiunge un&apos;altra lista allo spoglio. I piccoli <strong>+</strong>{' '}
        su voti e preferenze sono incrementi rapidi +1.
      </p>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nome elezione</label>
          <input
            value={meta.name}
            onChange={ev => setMeta(m => ({ ...m, name: ev.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Comune</label>
          <input
            value={meta.commune}
            onChange={ev => setMeta(m => ({ ...m, commune: ev.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Anno</label>
          <input
            type="number"
            value={meta.year}
            onChange={ev => setMeta(m => ({ ...m, year: ev.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Note (fonte, link Eligendo, ecc.)</label>
          <textarea
            value={meta.notes}
            onChange={ev => setMeta(m => ({ ...m, notes: ev.target.value }))}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2 border-t border-gray-200 pt-3 mt-1">
          <p className="text-xs font-medium text-gray-700 mb-2">Affluenza e schede (come da Eligendo)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Elettori</label>
              <input
                type="number"
                min={0}
                value={meta.registeredVoters}
                onChange={ev => setMeta(m => ({ ...m, registeredVoters: ev.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="—"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Votanti</label>
              <input
                type="number"
                min={0}
                value={meta.turnoutVoters}
                onChange={ev => setMeta(m => ({ ...m, turnoutVoters: ev.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="—"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Affluenza %</label>
              <input
                value={meta.turnoutPercent}
                onChange={ev => setMeta(m => ({ ...m, turnoutPercent: ev.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="es. 76,46"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Schede bianche</label>
              <input
                type="number"
                min={0}
                value={meta.ballotsBlank}
                onChange={ev => setMeta(m => ({ ...m, ballotsBlank: ev.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="—"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Non valide (bianche incl.)</label>
              <input
                type="number"
                min={0}
                value={meta.ballotsInvalidInclBlank}
                onChange={ev => setMeta(m => ({ ...m, ballotsInvalidInclBlank: ev.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="—"
              />
            </div>
          </div>
        </div>
        <div className="sm:col-span-2">
          <button
            type="button"
            disabled={metaSaving || !meta.name.trim() || !meta.commune.trim()}
            onClick={() => saveMeta()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {metaSaving ? 'Salvataggio…' : 'Salva dati elezione'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Spoglio per lista (voti macro)</h3>
        {e.results.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.listLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.listLogoUrl}
                      alt=""
                      className="w-10 h-10 object-contain rounded border border-gray-100 bg-white"
                    />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-gray-300 mt-1" aria-hidden />
                  )}
                  {r.coalitionLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.coalitionLogoUrl}
                      alt=""
                      title="Coalizione"
                      className="w-8 h-8 object-contain rounded opacity-90"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  {editingRowId === r.id && rowDraft ? (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">Modifica lista</p>
                      <p className="text-sm text-gray-800 truncate">{rowDraft.listName || 'Senza nome'}</p>
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-gray-900">{r.listName}</div>
                      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1 text-sm text-gray-600 items-center">
                        {r.coalition ? (
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">{r.coalition}</span>
                        ) : null}
                        {r.candidateMayor ? <span className="text-gray-600">Sindaco: {r.candidateMayor}</span> : null}
                        <span className="inline-flex flex-wrap items-center gap-1.5 text-gray-500 text-sm">
                          <button
                            type="button"
                            onClick={() => bumpListVotes(r)}
                            disabled={editingRowId != null || mergeBusy}
                            className="w-7 h-7 rounded border border-blue-200 text-blue-700 text-sm leading-none hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Aumenta voti di lista di 1"
                          >
                            +
                          </button>
                          <span>
                            {r.votes.toLocaleString('it-IT')} voti · {r.percentage.toFixed(1)}% ·{' '}
                            {r.seats != null ? `${r.seats} seggi` : 'seggi —'}
                          </span>
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-500">Anagrafica sindaco</span>
                        <select
                          value={r.mayorPersonId ?? ''}
                          onChange={async ev => {
                            const v = ev.target.value
                            await patchMayor(r, v ? parseInt(v, 10) : null)
                          }}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 max-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">—</option>
                          {persons.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.lastName} {p.firstName}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="text-xs text-indigo-600 font-medium hover:text-indigo-800 whitespace-nowrap"
                          onClick={() => suggestMayor(r)}
                        >
                          Suggerisci
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center justify-end">
                <span className="text-xs text-gray-400">{(r.councilCandidates ?? []).length} candidati</span>
                <button
                  type="button"
                  onClick={() => setExpandCouncilId(expandCouncilId === r.id ? null : r.id)}
                  className="text-indigo-600 text-sm font-medium hover:text-indigo-800"
                >
                  {expandCouncilId === r.id ? 'Chiudi candidati' : 'Candidati'}
                </button>
                {editingRowId === r.id ? (
                  <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-end sm:items-center">
                    <button
                      type="button"
                      onClick={() => saveRow()}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Salva
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelEditRow()}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Annulla
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={editingRowId != null && editingRowId !== r.id}
                      onClick={() => startEditRow(r)}
                      className="text-blue-600 text-sm font-medium hover:text-blue-800 disabled:opacity-40"
                    >
                      Modifica lista
                    </button>
                    <button
                      type="button"
                      disabled={editingRowId != null}
                      onClick={() => deleteListRow(r)}
                      className="text-red-600 text-sm font-medium hover:text-red-800 disabled:opacity-40"
                    >
                      Elimina lista
                    </button>
                  </>
                )}
              </div>
            </div>

            {editingRowId === r.id && rowDraft && (
              <div className="border-t border-gray-100 p-4 bg-gray-50/90 space-y-3 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nome lista</label>
                    <input
                      value={rowDraft.listName}
                      onChange={ev => setRowDraft(d => d && { ...d, listName: ev.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Coalizione</label>
                    <input
                      value={rowDraft.coalition}
                      onChange={ev => setRowDraft(d => d && { ...d, coalition: ev.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Sindaco (testo)</label>
                    <input
                      value={rowDraft.candidateMayor}
                      onChange={ev => setRowDraft(d => d && { ...d, candidateMayor: ev.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Anagrafica sindaco</label>
                    <select
                      value={rowDraft.mayorPersonId}
                      onChange={ev => setRowDraft(d => d && { ...d, mayorPersonId: ev.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">—</option>
                      {persons.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.lastName} {p.firstName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Voti</label>
                    <div className="flex gap-1.5 items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setRowDraft(d =>
                            d && { ...d, votes: String((parseInt(d.votes, 10) || 0) + 1) },
                          )
                        }
                        className="w-9 h-9 shrink-0 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"
                        aria-label="Aumenta voti di 1"
                      >
                        +
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={rowDraft.votes}
                        onChange={ev => setRowDraft(d => d && { ...d, votes: ev.target.value })}
                        className="min-w-0 flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Percentuale</label>
                    <input
                      value={rowDraft.percentage}
                      onChange={ev => setRowDraft(d => d && { ...d, percentage: ev.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Seggi</label>
                    <input
                      value={rowDraft.seats}
                      onChange={ev => setRowDraft(d => d && { ...d, seats: ev.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="—"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">URL logo lista</label>
                    <input
                      value={rowDraft.listLogoUrl}
                      onChange={ev => setRowDraft(d => d && { ...d, listLogoUrl: ev.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://…"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">URL logo coalizione</label>
                    <input
                      value={rowDraft.coalitionLogoUrl}
                      onChange={ev => setRowDraft(d => d && { ...d, coalitionLogoUrl: ev.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://…"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Note riga</label>
                    <input
                      value={rowDraft.notes}
                      onChange={ev => setRowDraft(d => d && { ...d, notes: ev.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Opzionale"
                    />
                  </div>
                </div>
              </div>
            )}

            {expandCouncilId === r.id && (
              <div className="border-t border-gray-100 p-4">
                <CouncilCandidatesEditor
                  listResultId={r.id}
                  candidates={r.councilCandidates ?? []}
                  persons={persons}
                  listRowEditing={editingRowId === r.id && rowDraft != null}
                  onReload={onReload}
                  embedded
                />
              </div>
            )}
          </div>
        ))}
        <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-700 max-w-xl">
            Per aggiungere <strong>un&apos;altra lista</strong> con i suoi voti di lista, percentuale e seggi, usa il + qui
            sotto (stesso comando del pulsante blu in alto).
          </p>
          <button
            type="button"
            disabled={listAddBusy || mergeBusy || editingRowId != null}
            onClick={() => addListRow()}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium"
          >
            {listAddBusy ? '…' : '+ Nuova riga voti lista'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-red-100 bg-red-50/50 p-4">
        <p className="text-xs text-red-800/90 mb-2">Eliminazione irreversibile dei soli dati storici (non tocca elezioni operative).</p>
        <button
          type="button"
          onClick={() => deleteHistoricalElection()}
          className="text-sm text-red-700 hover:text-red-900 border border-red-200 bg-white px-3 py-1.5 rounded-lg font-medium"
        >
          Elimina questa elezione storica
        </button>
      </div>
    </div>
  )
}

export default function HistoricalPage() {
  const searchParams = useSearchParams()
  const isAddMode = searchParams.get('mode') === 'add'

  const [elections, setElections] = useState<HistElection[]>([])
  const [archivedElections, setArchivedElections] = useState<ArchivedOpElection[]>([])
  /** "new" = crea HistoricalElection; altrimenti id elezione archiviata */
  const [storicoDestination, setStoricoDestination] = useState<string>('new')
  const [pendingCandidates, setPendingCandidates] = useState<HistoricalCandidateRow[]>([])
  const [form, setForm] = useState({ name: '', commune: '', year: String(new Date().getFullYear() - 5), notes: '' })
  const [resultLines, setResultLines] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [expandId, setExpandId] = useState<number | null>(null)
  const [importErr, setImportErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [persons, setPersons] = useState<PersonOpt[]>([])
  const [eligendoUrl, setEligendoUrl] = useState('')
  const [eligendoBusy, setEligendoBusy] = useState(false)
  const [eligendoPreview, setEligendoPreview] = useState<{
    titleRaw: string
    name: string
    commune: string
    year: number
    affluenza: EligendoAffluenza
    results: { listName: string; candidateMayor: string; votes: number; percentage: number; seats: number | null; listLogoUrl: string | null }[]
    macroTarget?: { electionId: number; canImport: boolean; reason?: string }
  } | null>(null)

  useEffect(() => {
    fetch('/api/persons')
      .then(r => r.json())
      .then((data: PersonOpt[]) => setPersons(Array.isArray(data) ? data : []))
      .catch(() => setPersons([]))
  }, [])

  async function load() {
    const res = await fetch('/api/historical')
    const data = await res.json()
    if (Array.isArray(data)) {
      setElections(data)
      setArchivedElections([])
    } else {
      setElections(data.flat ?? [])
      setArchivedElections(data.archivedOperational ?? [])
    }
  }
  useEffect(() => { load() }, [])

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function onExcelChosen(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    setImportErr('')
    setMsg('')
    f.arrayBuffer()
      .then(buf => {
        try {
          const { lists, candidates } = parseHistoricalExcelFull(buf)
          if (!lists.length && !candidates.length) {
            setImportErr('Nessuna riga valida. Usa i fogli «Risultati» e/o «Candidati» del modello.')
            setPendingCandidates([])
            return
          }
          setResultLines(lists.length ? historicalRowsToSemicolonLines(lists) : '')
          setPendingCandidates(candidates)
          if (candidates.length > 0 && storicoDestination === 'new' && lists.length > 0) {
            setMsg(
              'Macro liste importate. È presente anche il foglio «Candidati»: per caricare preferenze e anagrafica scegli come destinazione un’elezione archiviata, oppure usa Eligendo+Excel solo sull’archiviata.'
            )
          } else if (candidates.length > 0 && storicoDestination === 'new' && !lists.length) {
            setImportErr(
              'Solo foglio «Candidati»: per un nuovo record storico servono anche le liste, oppure importa candidati da una scheda storica già creata (Reimporta Excel).'
            )
            setPendingCandidates([])
            return
          } else {
            setMsg(
              candidates.length > 0
                ? `Importate ${lists.length} liste e ${candidates.length} righe candidati. Controlla e premi Salva.`
                : lists.length > 0
                  ? 'Dati importati dal file. Controlla il riepilogo sotto e premi Salva.'
                  : 'Solo candidati: scegli un’elezione archiviata e premi Salva.'
            )
          }
        } catch {
          setImportErr('Impossibile leggere il file. Scarica il modello e salva in formato .xlsx.')
          setPendingCandidates([])
        }
      })
      .catch(() => setImportErr('Lettura file non riuscita.'))
    if (fileRef.current) fileRef.current.value = ''
  }

  async function save() {
    setSaving(true)
    setMsg('')
    setImportErr('')
    const listRows: HistoricalParsedRow[] = resultLines.trim().split('\n').filter(Boolean).map(line => {
      const [listName, coalition, candidateMayor, votes, percentage, seats] = line.split(';').map(s => s.trim())
      let pct: number | null = null
      if (percentage !== '') {
        const n = parseFloat(percentage.replace(',', '.'))
        pct = Number.isNaN(n) ? null : n
      }
      let v: number | null = null
      if (votes !== '') {
        const n = parseInt(votes, 10)
        v = Number.isNaN(n) ? null : n
      }
      let seatsN: number | null = null
      if (seats !== '') {
        const n = parseInt(seats, 10)
        seatsN = Number.isNaN(n) ? null : n
      }
      return {
        listName,
        coalition: coalition || null,
        candidateMayor: candidateMayor || null,
        votes: v,
        percentage: pct,
        seats: seatsN,
      }
    })

    if (storicoDestination !== 'new') {
      if (listRows.length === 0 && pendingCandidates.length === 0) {
        setImportErr('Aggiungi righe risultato, candidati da Excel, oppure esegui prima l’import Eligendo su questa archiviata.')
        setSaving(false)
        return
      }
      const eid = Number(storicoDestination)
      const res = await fetch(`/api/elections/${eid}/import-storico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lists: listRows.length ? listRows : undefined,
          candidates: pendingCandidates.length ? pendingCandidates : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg(
          `Import su elezione archiviata: ${data.listsImported ?? 0} liste, ${data.candidatesImported ?? 0} candidati. Apri la scheda per modificare come un’elezione attiva.`
        )
        setResultLines('')
        setPendingCandidates([])
        setForm({ name: '', commune: '', year: String(new Date().getFullYear() - 5), notes: '' })
      } else {
        setImportErr(data.error || 'Salvataggio non riuscito')
      }
      setSaving(false)
      load()
      return
    }

    if (pendingCandidates.length > 0) {
      setImportErr(
        'Il foglio «Candidati» non è supportato per un nuovo record nella tabella storici. Scegli un’elezione archiviata come destinazione oppure rimuovi quel foglio dal file.'
      )
      setSaving(false)
      return
    }

    let resultsNormalized
    try {
      resultsNormalized = normalizeHistoricalRowsForCreate(listRows)
    } catch (err) {
      setImportErr(err instanceof Error ? err.message : 'Dati non validi')
      setSaving(false)
      return
    }

    const res = await fetch('/api/historical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, year: parseInt(form.year), results: resultsNormalized }),
    })
    if (res.ok) {
      setMsg('Elezione storica salvata')
      setForm({ name: '', commune: '', year: String(new Date().getFullYear() - 5), notes: '' })
      setResultLines('')
      setPendingCandidates([])
    }
    setSaving(false)
    load()
  }

  async function previewEligendo() {
    setImportErr('')
    setMsg('')
    if (!eligendoUrl.trim()) {
      setImportErr('Incolla prima il link della pagina risultati su elezionistorico.interno.gov.it')
      return
    }
    setEligendoBusy(true)
    try {
      const targetElectionId = storicoDestination !== 'new' ? Number(storicoDestination) : undefined
      const res = await fetch('/api/historical/import-eligendo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: eligendoUrl.trim(), preview: true, targetElectionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportErr(data.error || 'Import non riuscito')
        setEligendoPreview(null)
        return
      }
      setEligendoPreview({
        titleRaw: data.titleRaw,
        name: data.name,
        commune: data.commune,
        year: data.year,
        affluenza: data.affluenza ?? {
          registeredVoters: null,
          turnoutVoters: null,
          turnoutPercent: null,
          ballotsBlank: null,
          ballotsInvalidInclBlank: null,
        },
        results: data.results,
        macroTarget: data.macroTarget,
      })
      setMsg('Anteprima pronta. Se i dati sono corretti, conferma l’import.')
    } catch {
      setImportErr('Errore di rete o risposta non valida.')
      setEligendoPreview(null)
    } finally {
      setEligendoBusy(false)
    }
  }

  async function confirmEligendoImport() {
    if (!eligendoUrl.trim() || !eligendoPreview) return
    setEligendoBusy(true)
    setImportErr('')
    try {
      const targetElectionId = storicoDestination !== 'new' ? Number(storicoDestination) : undefined
      const res = await fetch('/api/historical/import-eligendo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: eligendoUrl.trim(), preview: false, targetElectionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportErr(data.error || 'Salvataggio non riuscito')
        return
      }
      if (data.mode === 'archived_election') {
        const n = data.election?.lists?.length ?? data.parsed?.results?.length ?? 0
        setMsg(`Macro Eligendo applicato all’elezione archiviata (${n} liste). Puoi aggiungere candidati da Excel o modificare tutto in amministrazione.`)
      } else {
        const n = data.election?.results?.length ?? 0
        setMsg(
          `Elezione storica creata con ${n} liste (fonte Eligendo). Apri la scheda e usa «Scarica Excel candidati (precompilato)» per aggiungere preferenze, poi «Reimporta Excel» se lavori in foglio.`
        )
      }
      setEligendoPreview(null)
      setEligendoUrl('')
      load()
    } catch {
      setImportErr('Errore durante il salvataggio.')
    } finally {
      setEligendoBusy(false)
    }
  }

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800 hover:underline">
          Elezioni
        </Link>
        <span className="text-gray-300" aria-hidden>
          /
        </span>
        <span className="text-gray-900 font-medium">Dati storici</span>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Elezioni storiche</h1>
        {isAddMode ? (
          <Link href="/admin/historical" className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium">
            Torna ai dati storici
          </Link>
        ) : (
          <Link href="/admin/historical/add" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium">
            + Aggiungi
          </Link>
        )}
      </div>

      {isAddMode && archivedElections.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 mb-6">
          <h2 className="font-semibold text-amber-950 text-sm mb-2">Elezioni archiviate (dati operativi)</h2>
          <p className="text-xs text-amber-900 mb-2">
            Puoi importare il <strong>macro Eligendo</strong> e il dettaglio <strong>candidati da Excel</strong> sulla stessa elezione, poi modificare liste e preferenze come per un’elezione attiva dalla{' '}
            <Link href="/admin" className="underline font-medium text-indigo-800">
              dashboard elezioni
            </Link>
            .
          </p>
          <ul className="text-sm text-amber-950 space-y-1">
            {archivedElections.map(a => (
              <li key={a.id}>
                <Link href={`/admin/elections/${a.id}`} className="text-indigo-700 hover:underline font-medium">
                  {a.name}
                </Link>
                <span className="text-amber-800/80">
                  {' '}
                  · {a.commune} · {new Date(a.date).getFullYear()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAddMode && msg && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-2 mb-4">{msg}</div>}
      {isAddMode && importErr && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">{importErr}</div>}

      {isAddMode && (
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-indigo-900 mb-2">Importa da Eligendo (Ministero dell&apos;Interno)</h2>
        <p className="text-sm text-indigo-800 mb-3">
          Incolla il link della pagina di risultati comunali dall&apos;{' '}
          <a
            href="https://elezionistorico.interno.gov.it/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            Archivio Eligendo
          </a>
          . Vengono letti affluenza, liste, voti, percentuali, seggi e simboli. Scegli sotto se creare un{' '}
          <strong>record nella tabella storici</strong> oppure applicare il macro a un&apos;<strong>elezione archiviata</strong>{' '}
          (stessa scheda admin delle elezioni operative). I candidati si possono aggiungere con il foglio Excel «Candidati» sulla
          destinazione archiviata.
        </p>
        <div className="mb-3">
          <label className="block text-xs font-medium text-indigo-900 mb-1">Destinazione import</label>
          <select
            value={storicoDestination}
            onChange={e => {
              setStoricoDestination(e.target.value)
              setEligendoPreview(null)
            }}
            className="w-full max-w-xl border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="new">Nuovo record (tabella storici)</option>
            {archivedElections.map(a => (
              <option key={a.id} value={String(a.id)}>
                {a.name} — {a.commune} ({new Date(a.date).getFullYear()})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={eligendoUrl}
            onChange={e => setEligendoUrl(e.target.value)}
            placeholder="https://elezionistorico.interno.gov.it/index.php?..."
            className="flex-1 border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          <button
            type="button"
            disabled={eligendoBusy}
            onClick={() => previewEligendo()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {eligendoBusy && !eligendoPreview ? 'Lettura…' : 'Anteprima'}
          </button>
          {eligendoPreview && (
            <button
              type="button"
              disabled={
                eligendoBusy ||
                (!!eligendoPreview.macroTarget && !eligendoPreview.macroTarget.canImport)
              }
              onClick={() => confirmEligendoImport()}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Conferma import
            </button>
          )}
        </div>
        {eligendoPreview && (
          <div className="mt-4 text-sm text-indigo-900 space-y-2">
            {eligendoPreview.macroTarget && !eligendoPreview.macroTarget.canImport && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {eligendoPreview.macroTarget.reason}
              </div>
            )}
            <p>
              <strong>{eligendoPreview.name}</strong> · {eligendoPreview.commune} · {eligendoPreview.year}
            </p>
            <p className="text-xs text-indigo-700 break-all">{eligendoPreview.titleRaw}</p>
            {(eligendoPreview.affluenza.registeredVoters != null ||
              eligendoPreview.affluenza.turnoutVoters != null ||
              eligendoPreview.affluenza.ballotsBlank != null ||
              eligendoPreview.affluenza.ballotsInvalidInclBlank != null) && (
              <div className="rounded-lg border border-indigo-100 bg-white px-3 py-2 text-xs text-indigo-900 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                {eligendoPreview.affluenza.registeredVoters != null && (
                  <span>
                    Elettori: <strong>{eligendoPreview.affluenza.registeredVoters.toLocaleString('it-IT')}</strong>
                  </span>
                )}
                {eligendoPreview.affluenza.turnoutVoters != null && (
                  <span>
                    Votanti: <strong>{eligendoPreview.affluenza.turnoutVoters.toLocaleString('it-IT')}</strong>
                    {eligendoPreview.affluenza.turnoutPercent != null && (
                      <> ({eligendoPreview.affluenza.turnoutPercent.toFixed(2).replace('.', ',')} %)</>
                    )}
                  </span>
                )}
                {eligendoPreview.affluenza.ballotsBlank != null && (
                  <span>
                    Schede bianche: <strong>{eligendoPreview.affluenza.ballotsBlank}</strong>
                  </span>
                )}
                {eligendoPreview.affluenza.ballotsInvalidInclBlank != null && (
                  <span className="sm:col-span-2">
                    Non valide (bianche incl.):{' '}
                    <strong>{eligendoPreview.affluenza.ballotsInvalidInclBlank}</strong>
                  </span>
                )}
              </div>
            )}
            <div className="overflow-x-auto border border-indigo-100 rounded-lg bg-white">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="p-2 w-10"> </th>
                    <th className="p-2">Lista</th>
                    <th className="p-2">Sindaco</th>
                    <th className="p-2 text-right">Voti</th>
                    <th className="p-2 text-right">%</th>
                    <th className="p-2 text-right">Seggi</th>
                  </tr>
                </thead>
                <tbody>
                  {eligendoPreview.results.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="p-1">
                        {r.listLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.listLogoUrl} alt="" className="w-8 h-8 object-contain" />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-2 font-medium">{r.listName}</td>
                      <td className="p-2 text-gray-600">{r.candidateMayor || '—'}</td>
                      <td className="p-2 text-right">{r.votes.toLocaleString('it-IT')}</td>
                      <td className="p-2 text-right">{r.percentage.toFixed(2)}</td>
                      <td className="p-2 text-right">{r.seats ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isAddMode && (
        <>
        {/* Add form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Aggiungi elezione storica</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Destinazione salvataggio</label>
              <select
                value={storicoDestination}
                onChange={e => setStoricoDestination(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="new">Nuovo record (tabella storici)</option>
                {archivedElections.map(a => (
                  <option key={a.id} value={String(a.id)}>
                    Archiviata: {a.name} — {a.commune} ({new Date(a.date).getFullYear()})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Con un&apos;archiviata puoi inviare macro liste + foglio «Candidati»; i campi Nome/Comune/Anno sotto valgono solo per un nuovo record storico.
              </p>
            </div>
            {[['Nome', 'name', 'text', 'es. Elezioni Comunali 2020'], ['Comune', 'commune', 'text', 'Comune di ...'], ['Anno', 'year', 'number', '2020'], ['Note', 'notes', 'text', '']].map(([label, key, type, ph]) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input type={type} value={(form as Record<string, string>)[key]} onChange={e => setF(key, e.target.value)}
                  placeholder={ph}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-800">Risultati per lista</p>
              <p className="text-xs text-gray-500">
                Modello Excel: foglio <strong>Risultati</strong> (macro) e opzionale <strong>Candidati</strong> (solo se destinazione = elezione archiviata).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadHistoricalExcelTemplate()}
                  className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Scarica modello Excel
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Importa file Excel
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => onExcelChosen(e.target.files)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Anteprima / modifica testo (una riga per lista)</label>
              <p className="text-xs text-gray-400 mb-1">Formato: NomeLista;Coalizione;CandidatoSindaco;Voti;%Voti;Seggi</p>
              <textarea value={resultLines} onChange={e => setResultLines(e.target.value)} rows={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={"Lista Civica;Centro-Sinistra;Mario Rossi;3200;28.5;10\nPartito Blu;Centro-Destra;Anna Verdi;2800;24.9;9"} />
            </div>
            <button
              onClick={save}
              disabled={(storicoDestination === 'new' && (!form.name || !form.commune)) || saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? 'Salvataggio...' : storicoDestination === 'new' ? 'Salva elezione storica' : 'Importa su elezione archiviata'}
            </button>
          </div>
        </div>
        </>
        )}

        {/* List */}
        {!isAddMode && (
        <div className="space-y-3 lg:col-span-2">
          {elections.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              Nessuna elezione storica inserita
            </div>
          ) : elections.map(e => (
            <div key={e.id} className="bg-white rounded-xl border border-gray-200">
              <button className="w-full text-left p-4 flex items-center justify-between" onClick={() => setExpandId(expandId === e.id ? null : e.id)}>
                <div>
                  <h3 className="font-semibold text-gray-900">{e.name}</h3>
                  <p className="text-sm text-gray-500">{e.commune} · {e.year} · {e.results.length} liste</p>
                </div>
                <span className="text-gray-400 text-sm">{expandId === e.id ? '▲' : '▼'}</span>
              </button>
              {expandId === e.id && (
                <ExpandedHistoricalElection
                  election={e}
                  persons={persons}
                  onReload={load}
                  setPersons={setPersons}
                  onDeleted={() => {
                    setExpandId(null)
                    load()
                  }}
                />
              )}
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}
