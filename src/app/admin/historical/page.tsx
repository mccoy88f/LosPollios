'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  downloadHistoricalExcelTemplate,
  historicalRowsToSemicolonLines,
  parseHistoricalExcelFull,
} from '@/lib/historicalExcel'
import type { HistoricalCandidateRow } from '@/lib/historicalExcel'
import type { EligendoAffluenza } from '@/lib/eligendoImport'
import { confirmElectionDeletionTwice } from '@/lib/confirmDelete'

function numToInput(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return ''
  return String(n)
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

  async function deleteHistoricalElection() {
    const ok = confirmElectionDeletionTwice({
      title: `Eliminare l’elezione storica «${e.name}»?`,
      detail: `${e.commune} · ${e.year}. Verranno eliminate tutte le righe lista e i dati di affluenza associati a questo record storico.`,
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

  return (
    <div className="border-t border-gray-100 p-4 space-y-4">
      <p className="text-xs text-gray-600">
        Dopo l&apos;import (Eligendo o altro) puoi correggere qui nome elezione, comune, anno, note e ogni riga lista:
        nome, coalizione, sindaco, voti, percentuali, seggi, URL loghi e note. Il modello storico è per lista (non include
        preferenze dei singoli candidati come nello spoglio sezione per sezione).
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

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-gray-100">
              <th className="text-left pb-2 w-10"> </th>
              <th className="text-left pb-2">Lista</th>
              <th className="text-left pb-2">Coalizione</th>
              <th className="text-left pb-2">Sindaco (testo)</th>
              <th className="text-left pb-2 min-w-[180px]">Anagrafica sindaco</th>
              <th className="text-right pb-2">Voti</th>
              <th className="text-right pb-2">%</th>
              <th className="text-right pb-2">Seggi</th>
              <th className="text-right pb-2 w-36">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {e.results.map(r => (
              <Fragment key={r.id}>
                <tr className="border-b border-gray-50 last:border-0 align-top">
                  <td className="py-1.5">
                    {r.listLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.listLogoUrl} alt="" className="w-8 h-8 object-contain" />
                    ) : r.coalitionLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.coalitionLogoUrl} alt="" title="Coalizione" className="w-7 h-7 object-contain opacity-90" />
                    ) : (
                      <span className="text-gray-300">·</span>
                    )}
                  </td>
                  {editingRowId === r.id && rowDraft ? (
                    <>
                      <td className="py-1.5">
                        <input
                          value={rowDraft.listName}
                          onChange={ev => setRowDraft(d => d && { ...d, listName: ev.target.value })}
                          className="w-full min-w-[120px] border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="py-1.5">
                        <input
                          value={rowDraft.coalition}
                          onChange={ev => setRowDraft(d => d && { ...d, coalition: ev.target.value })}
                          className="w-full min-w-[100px] border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="py-1.5">
                        <input
                          value={rowDraft.candidateMayor}
                          onChange={ev => setRowDraft(d => d && { ...d, candidateMayor: ev.target.value })}
                          className="w-full min-w-[120px] border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="py-1.5">
                        <select
                          value={rowDraft.mayorPersonId}
                          onChange={ev => setRowDraft(d => d && { ...d, mayorPersonId: ev.target.value })}
                          className="text-xs border border-gray-200 rounded px-1 py-1 max-w-[160px]"
                        >
                          <option value="">—</option>
                          {persons.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.lastName} {p.firstName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5">
                        <input
                          type="number"
                          min={0}
                          value={rowDraft.votes}
                          onChange={ev => setRowDraft(d => d && { ...d, votes: ev.target.value })}
                          className="w-24 border border-gray-300 rounded px-2 py-1 text-xs text-right"
                        />
                      </td>
                      <td className="py-1.5">
                        <input
                          value={rowDraft.percentage}
                          onChange={ev => setRowDraft(d => d && { ...d, percentage: ev.target.value })}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-xs text-right"
                        />
                      </td>
                      <td className="py-1.5">
                        <input
                          value={rowDraft.seats}
                          onChange={ev => setRowDraft(d => d && { ...d, seats: ev.target.value })}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-xs text-right"
                          placeholder="—"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-1.5 font-medium">{r.listName}</td>
                      <td className="py-1.5 text-gray-500">{r.coalition || '—'}</td>
                      <td className="py-1.5 text-gray-600">{r.candidateMayor || '—'}</td>
                      <td className="py-1.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <select
                            value={r.mayorPersonId ?? ''}
                            onChange={async ev => {
                              const v = ev.target.value
                              await patchMayor(r, v ? parseInt(v, 10) : null)
                            }}
                            className="text-xs border border-gray-200 rounded px-1 py-1 max-w-[160px]"
                          >
                            <option value="">—</option>
                            {persons.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.lastName} {p.firstName}
                              </option>
                            ))}
                          </select>
                          <button type="button" className="text-xs text-indigo-600 whitespace-nowrap" onClick={() => suggestMayor(r)}>
                            Suggerisci
                          </button>
                        </div>
                      </td>
                      <td className="py-1.5 text-right">{r.votes.toLocaleString('it-IT')}</td>
                      <td className="py-1.5 text-right">{r.percentage.toFixed(1)}%</td>
                      <td className="py-1.5 text-right text-gray-700">{r.seats ?? '—'}</td>
                    </>
                  )}
                  <td className="py-1.5 text-right">
                    {editingRowId === r.id ? (
                      <div className="flex flex-col gap-1 items-end">
                        <button type="button" onClick={() => saveRow()} className="text-xs font-medium text-blue-600">
                          Salva riga
                        </button>
                        <button type="button" onClick={() => cancelEditRow()} className="text-xs text-gray-500">
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={editingRowId != null}
                        onClick={() => startEditRow(r)}
                        className="text-xs font-medium text-blue-600 disabled:opacity-40"
                      >
                        Modifica
                      </button>
                    )}
                  </td>
                </tr>
                {editingRowId === r.id && rowDraft && (
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <td />
                    <td colSpan={8} className="py-2 px-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-gray-500">URL logo lista</label>
                          <input
                            value={rowDraft.listLogoUrl}
                            onChange={ev => setRowDraft(d => d && { ...d, listLogoUrl: ev.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1 font-mono text-[11px] mt-0.5"
                            placeholder="https://…"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500">URL logo coalizione</label>
                          <input
                            value={rowDraft.coalitionLogoUrl}
                            onChange={ev => setRowDraft(d => d && { ...d, coalitionLogoUrl: ev.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1 font-mono text-[11px] mt-0.5"
                            placeholder="https://…"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-gray-500">Note riga</label>
                          <input
                            value={rowDraft.notes}
                            onChange={ev => setRowDraft(d => d && { ...d, notes: ev.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1 mt-0.5"
                            placeholder="Opzionale"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
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
          if (!lists.length) {
            setImportErr('Nessuna riga valida nel file. Usa il foglio «Risultati» del modello.')
            setPendingCandidates([])
            return
          }
          setResultLines(historicalRowsToSemicolonLines(lists))
          setPendingCandidates(candidates)
          if (candidates.length > 0 && storicoDestination === 'new') {
            setMsg(
              'Macro liste importate. È presente anche il foglio «Candidati»: per caricare preferenze e anagrafica scegli come destinazione un’elezione archiviata, oppure usa Eligendo+Excel solo sull’archiviata.'
            )
          } else {
            setMsg(
              candidates.length > 0
                ? `Importate ${lists.length} liste e ${candidates.length} righe candidati. Controlla e premi Salva.`
                : 'Dati importati dal file. Controlla il riepilogo sotto e premi Salva.'
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
    // Parse result lines: listName;coalition;candidateMayor;votes;percentage;seats
    const results = resultLines.trim().split('\n').filter(Boolean).map(line => {
      const [listName, coalition, candidateMayor, votes, percentage, seats] = line.split(';').map(s => s.trim())
      return { listName, coalition: coalition || null, candidateMayor: candidateMayor || null, votes: parseInt(votes) || 0, percentage: parseFloat(percentage) || 0, seats: seats ? parseInt(seats) : null }
    })

    if (storicoDestination !== 'new') {
      if (results.length === 0 && pendingCandidates.length === 0) {
        setImportErr('Aggiungi righe risultato, candidati da Excel, oppure esegui prima l’import Eligendo su questa archiviata.')
        setSaving(false)
        return
      }
      const eid = Number(storicoDestination)
      const res = await fetch(`/api/elections/${eid}/import-storico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists: results.length ? results : undefined, candidates: pendingCandidates.length ? pendingCandidates : undefined }),
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

    const res = await fetch('/api/historical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, year: parseInt(form.year), results }),
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
        setMsg(`Elezione storica creata con ${n} liste (fonte Eligendo).`)
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Elezioni storiche</h1>

      {archivedElections.length > 0 && (
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

      {msg && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-2 mb-4">{msg}</div>}
      {importErr && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">{importErr}</div>}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* List */}
        <div className="space-y-3">
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
      </div>
    </div>
  )
}
