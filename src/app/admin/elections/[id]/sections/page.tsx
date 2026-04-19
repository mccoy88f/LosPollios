'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { DaitCommuneSummary } from '@/lib/daitSezioniOpenData'

interface Section {
  id: number
  number: number
  name: string | null
  location: string | null
  theoreticalVoters: number
  locked: boolean
  turnout?: { votersActual: number } | null
}

export default function SectionsPage() {
  const { id } = useParams<{ id: string }>()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkCount, setBulkCount] = useState('')
  const [bulkVoters, setBulkVoters] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', location: '', theoreticalVoters: '' })
  const [newForm, setNewForm] = useState({ number: '', name: '', location: '', theoreticalVoters: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [daitCommunes, setDaitCommunes] = useState<DaitCommuneSummary[] | null>(null)
  const [daitFetchedAt, setDaitFetchedAt] = useState<number | null>(null)
  const [daitRowsTotal, setDaitRowsTotal] = useState<number | null>(null)
  const [daitLoading, setDaitLoading] = useState(false)
  const [daitErr, setDaitErr] = useState('')
  const [communeSearch, setCommuneSearch] = useState('')
  const [selectedDait, setSelectedDait] = useState<DaitCommuneSummary | null>(null)
  const [daitPreviewCount, setDaitPreviewCount] = useState<number | null>(null)
  const [daitDefaultVoters, setDaitDefaultVoters] = useState('0')
  const [daitUpdateTheoretical, setDaitUpdateTheoretical] = useState(false)
  const [electionCap, setElectionCap] = useState<number | null>(null)
  const [sectionErr, setSectionErr] = useState('')

  const filteredCommunes = useMemo(() => {
    if (!daitCommunes) return []
    const q = communeSearch.trim().toLowerCase()
    if (!q) return daitCommunes.slice(0, 150)
    return daitCommunes
      .filter(
        c =>
          c.comune.toLowerCase().includes(q) ||
          c.istat.includes(q) ||
          c.provincia.toLowerCase().includes(q)
      )
      .slice(0, 200)
  }, [daitCommunes, communeSearch])

  const sumSections = useMemo(
    () => sections.reduce((s, x) => s + x.theoreticalVoters, 0),
    [sections]
  )

  async function load() {
    setSectionErr('')
    const [resSec, resEl] = await Promise.all([
      fetch(`/api/elections/${id}/sections`),
      fetch(`/api/elections/${id}`),
    ])
    setSections(await resSec.json())
    const el = await resEl.json()
    if (resEl.ok && el.eligibleVotersTotal != null) {
      setElectionCap(Number(el.eligibleVotersTotal))
    } else {
      setElectionCap(null)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function fetchDaitCommunes(refresh: boolean) {
    setDaitErr('')
    setDaitLoading(true)
    try {
      const res = await fetch(`/api/admin/dait-sezioni${refresh ? '?refresh=1' : ''}`)
      const data = await res.json()
      if (!res.ok) {
        setDaitErr(data.error || 'Caricamento non riuscito')
        setDaitCommunes(null)
        return
      }
      setDaitCommunes(data.communes)
      setDaitFetchedAt(data.fetchedAt)
      setDaitRowsTotal(data.totalRows ?? null)
      setMsg(
        refresh
          ? `Elenco DAIT aggiornato: ${data.communesCount} comuni, ${data.totalRows ?? '—'} righe sezioni.`
          : `Elenco DAIT caricato: ${data.communesCount} comuni.`
      )
    } catch {
      setDaitErr('Errore di rete o timeout (il file CSV è molto grande). Riprova.')
      setDaitCommunes(null)
    } finally {
      setDaitLoading(false)
    }
  }

  async function previewDaitCommune(c: DaitCommuneSummary) {
    setSelectedDait(c)
    setDaitPreviewCount(null)
    setDaitErr('')
    const dv = parseInt(daitDefaultVoters, 10) || 0
    try {
      const res = await fetch(
        `/api/admin/dait-sezioni?istat=${encodeURIComponent(c.istat)}&defaultVoters=${dv}`
      )
      const data = await res.json()
      if (!res.ok) {
        setDaitErr(data.error || 'Anteprima non disponibile')
        return
      }
      setDaitPreviewCount(data.sectionCount ?? 0)
    } catch {
      setDaitErr('Errore anteprima')
    }
  }

  async function importDaitSections() {
    if (!selectedDait) {
      setDaitErr('Seleziona un comune dall’elenco.')
      return
    }
    if (
      !window.confirm(
        `Importare o aggiornare le sezioni da open data DAIT per «${selectedDait.comune}» (${selectedDait.istat})?\n\n` +
          `Verranno create o aggiornate ${daitPreviewCount ?? selectedDait.sectionCount} sezioni (numero, nome, indirizzo). ` +
          `${daitUpdateTheoretical ? 'Anche gli aventi diritto al voto per sezione verranno aggiornati.' : 'Gli aventi diritto al voto già impostati restano invariati, salvo per le sezioni nuove.'}`
      )
    )
      return
    setDaitErr('')
    setSaving(true)
    try {
      const res = await fetch(`/api/elections/${id}/sections/import-dait`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          istat: selectedDait.istat,
          defaultTheoreticalVoters: parseInt(daitDefaultVoters, 10) || 0,
          updateTheoreticalVoters: daitUpdateTheoretical,
          refresh: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setDaitErr(data.error || 'Import non riuscito')
        return
      }
      setMsg(`Import DAIT: ${data.count} sezioni per «${data.comune ?? selectedDait.comune}».`)
      load()
    } catch {
      setDaitErr('Errore durante l’import')
    } finally {
      setSaving(false)
    }
  }

  async function bulkCreate() {
    setSaving(true)
    setSectionErr('')
    const n = parseInt(bulkCount)
    const v = parseInt(bulkVoters)
    if (!n || n < 1) {
      setSaving(false)
      return
    }
    const secs = Array.from({ length: n }, (_, i) => ({
      number: i + 1, name: `Sezione ${i + 1}`, theoreticalVoters: v || 0,
    }))
    const res = await fetch(`/api/elections/${id}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: secs }),
    })
    const data = await res.json()
    if (!res.ok) {
      setSectionErr(data.error || 'Operazione non riuscita')
      setSaving(false)
      return
    }
    setBulkCount('')
    setBulkVoters('')
    setMsg(`${n} sezioni create`)
    setSaving(false)
    load()
  }

  async function addSection() {
    setSaving(true)
    setSectionErr('')
    const res = await fetch(`/api/elections/${id}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newForm, number: parseInt(newForm.number), theoreticalVoters: parseInt(newForm.theoreticalVoters) || 0 }),
    })
    const data = await res.json()
    if (!res.ok) {
      setSectionErr(data.error || 'Operazione non riuscita')
      setSaving(false)
      return
    }
    setNewForm({ number: '', name: '', location: '', theoreticalVoters: '' })
    setSaving(false)
    load()
  }

  async function saveEdit(secId: number) {
    setSaving(true)
    setSectionErr('')
    const res = await fetch(`/api/elections/${id}/sections/${secId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, theoreticalVoters: parseInt(editForm.theoreticalVoters) || 0 }),
    })
    const data = await res.json()
    if (!res.ok) {
      setSectionErr(data.error || 'Operazione non riuscita')
      setSaving(false)
      return
    }
    setEditId(null)
    setSaving(false)
    load()
  }

  async function deleteSection(secId: number) {
    if (!confirm('Eliminare questa sezione?')) return
    await fetch(`/api/elections/${id}/sections/${secId}`, { method: 'DELETE' })
    load()
  }

  async function toggleSectionLock(secId: number, currentlyLocked: boolean) {
    const next = !currentlyLocked
    if (next && !confirm('Chiudere questa sezione? I rappresentanti non potranno più modificare i dati inseriti.')) return
    if (!next && !confirm('Riaprire la sezione ai rappresentanti?')) return
    setSaving(true)
    await fetch(`/api/elections/${id}/sections/${secId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked: next }),
    })
    setSaving(false)
    load()
  }

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link href="/admin" className="text-blue-600 hover:underline">
          Elezioni
        </Link>
        <span className="text-gray-300" aria-hidden>
          /
        </span>
        <Link href={`/admin/elections/${id}`} className="text-blue-600 hover:underline">
          Scheda elezione
        </Link>
        <span className="text-gray-300" aria-hidden>
          /
        </span>
        <span className="text-gray-900 font-medium">Sezioni</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Sezioni elettorali</h1>

      {electionCap != null && (
        <div
          className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
            sumSections > electionCap
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          <strong>Tetto comunale:</strong> {electionCap.toLocaleString('it-IT')} aventi diritto ·{' '}
          <strong>Somma sezioni:</strong> {sumSections.toLocaleString('it-IT')} ·{' '}
          <strong>Residuo:</strong> {(electionCap - sumSections).toLocaleString('it-IT')}
          <span className="block text-xs mt-1 opacity-90">
            Modifica il tetto dalla scheda elezione (Modifica) se serve. La somma delle sezioni non può superare il tetto.
          </span>
        </div>
      )}

      {msg && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-2 mb-4">{msg}</div>}
      {sectionErr && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">{sectionErr}</div>}
      {daitErr && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">{daitErr}</div>}

      {/* Open data DAIT — sezioni per comune */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-sky-950 mb-1">Open data Ministero — elenco sezioni</h2>
        <p className="text-sm text-sky-900 mb-3">
          Fonte ufficiale:{' '}
          <a
            href="https://dait.interno.gov.it/territorio-e-autonomie-locali/sut/open_data/elenco_sezioni_csv.php"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium break-all"
          >
            dait.interno.gov.it — elenco_sezioni_csv.php
          </a>
          . Scarica l’elenco nazionale (file grande, può richiedere un minuto), cerca il comune e importa numero sezione,
          ubicazione e indirizzo senza digitarli a mano. Puoi riscaricare quando vuoi per allinearti agli aggiornamenti dei comuni.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            disabled={daitLoading}
            onClick={() => fetchDaitCommunes(false)}
            className="bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {daitLoading ? 'Scaricamento…' : 'Carica elenco comuni'}
          </button>
          <button
            type="button"
            disabled={daitLoading}
            onClick={() => fetchDaitCommunes(true)}
            className="bg-white border border-sky-300 text-sky-900 hover:bg-sky-100 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Riscarica da Ministero
          </button>
        </div>
        {daitFetchedAt != null && (
          <p className="text-xs text-sky-800 mb-3">
            Dati in cache server: {new Date(daitFetchedAt).toLocaleString('it-IT')}
            {daitRowsTotal != null && ` · ${daitRowsTotal.toLocaleString('it-IT')} righe sezioni`}
          </p>
        )}
        {daitCommunes && (
          <div className="space-y-3 bg-white/80 rounded-lg border border-sky-100 p-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cerca comune o codice ISTAT</label>
              <input
                value={communeSearch}
                onChange={e => setCommuneSearch(e.target.value)}
                placeholder="es. Chieti, 069022, Milano…"
                className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg text-sm">
              {filteredCommunes.length === 0 ? (
                <div className="p-3 text-gray-500">Nessun risultato. Modifica la ricerca.</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredCommunes.map(c => (
                    <li key={c.istat}>
                      <button
                        type="button"
                        onClick={() => previewDaitCommune(c)}
                        className={`w-full text-left px-3 py-2 hover:bg-sky-50 ${
                          selectedDait?.istat === c.istat ? 'bg-sky-100 font-medium' : ''
                        }`}
                      >
                        <span className="text-gray-900">{c.comune}</span>
                        <span className="text-gray-500 text-xs ml-2">
                          ({c.provincia}, {c.regione}) · ISTAT {c.istat} · {c.sectionCount} sez.
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selectedDait && (
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Aventi diritto al voto (default nuove sezioni)</label>
                  <input
                    type="number"
                    min={0}
                    value={daitDefaultVoters}
                    onChange={e => setDaitDefaultVoters(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 w-32 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={daitUpdateTheoretical}
                    onChange={e => setDaitUpdateTheoretical(e.target.checked)}
                  />
                  Aggiorna anche gli aventi diritto al voto sulle sezioni già esistenti
                </label>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => importDaitSections()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Importa / aggiorna sezioni ({daitPreviewCount ?? selectedDait.sectionCount})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk creation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Creazione rapida sezioni</h2>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Numero sezioni</label>
            <input type="number" min="1" value={bulkCount} onChange={e => setBulkCount(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="es. 20" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Aventi diritto al voto (per sezione)</label>
            <input type="number" min="0" value={bulkVoters} onChange={e => setBulkVoters(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="es. 800" />
          </div>
          <button onClick={bulkCreate} disabled={!bulkCount || saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
            Crea sezioni
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Le sezioni esistenti non vengono sovrascritte. Puoi modificarle singolarmente.</p>
      </div>

      {/* Sections table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">N.</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Nome</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Luogo</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium text-xs leading-tight max-w-[7rem]">
                Aventi diritto al voto
              </th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Votanti</th>
              <th className="text-center px-4 py-3 text-gray-600 font-medium">Inserimento</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Caricamento...</td></tr>
            ) : sections.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nessuna sezione</td></tr>
            ) : sections.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 last:border-0">
                {editId === s.id ? (
                  <>
                    <td className="px-4 py-2 font-mono text-gray-500">{s.number}</td>
                    <td className="px-4 py-2">
                      <input value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))}
                        className="border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editForm.location} onChange={e => setEditForm(f => ({...f, location: e.target.value}))}
                        className="border border-gray-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" value={editForm.theoreticalVoters} onChange={e => setEditForm(f => ({...f, theoreticalVoters: e.target.value}))}
                        className="border border-gray-300 rounded px-2 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                    </td>
                    <td className="px-4 py-2 text-right text-gray-400">-</td>
                    <td className="px-4 py-2 text-center text-gray-400">—</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => saveEdit(s.id)} className="text-blue-600 hover:text-blue-800 font-medium mr-2">Salva</button>
                      <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600">Annulla</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-mono text-gray-700 font-semibold">{s.number}</td>
                    <td className="px-4 py-3 text-gray-800">{s.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.location || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{s.theoreticalVoters.toLocaleString('it-IT')}</td>
                    <td className="px-4 py-3 text-right">
                      {s.turnout ? (
                        <span className="text-green-600 font-medium">{s.turnout.votersActual.toLocaleString('it-IT')}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSectionLock(s.id, s.locked)}
                        disabled={saving}
                        className={`text-xs font-medium px-2 py-1 rounded-lg border transition-colors disabled:opacity-60 ${
                          s.locked
                            ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
                        }`}
                      >
                        {s.locked ? 'Chiusa · Riapri' : 'Aperta · Chiudi'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditId(s.id); setEditForm({ name: s.name || '', location: s.location || '', theoreticalVoters: String(s.theoreticalVoters) }) }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3">Modifica</button>
                      <button onClick={() => deleteSection(s.id)} className="text-red-400 hover:text-red-600 text-xs font-medium">Elimina</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add single section */}
      <details className="bg-white rounded-xl border border-gray-200 p-5">
        <summary className="font-medium text-gray-700 cursor-pointer">+ Aggiungi sezione singola</summary>
        <div className="flex gap-3 mt-4 flex-wrap items-end">
          {[['N.', 'number', '1'], ['Nome', 'name', 'Sezione 1'], ['Luogo', 'location', 'Via ...'], ['Aventi diritto', 'theoreticalVoters', '800']].map(([label, key, placeholder]) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input
                value={(newForm as Record<string, string>)[key]}
                onChange={e => setNewForm(f => ({...f, [key]: e.target.value}))}
                placeholder={placeholder}
                className="border border-gray-300 rounded-lg px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          <button onClick={addSection} disabled={!newForm.number || saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium text-sm">
            Aggiungi
          </button>
        </div>
      </details>
    </div>
  )
}
