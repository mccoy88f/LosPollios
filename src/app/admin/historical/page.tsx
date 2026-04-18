'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  downloadHistoricalExcelTemplate,
  historicalRowsToSemicolonLines,
  parseHistoricalExcel,
} from '@/lib/historicalExcel'

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
}
interface HistElection { id: number; name: string; commune: string; year: number; notes: string | null; results: HistResult[] }
interface PersonOpt { id: number; firstName: string; lastName: string }

export default function HistoricalPage() {
  const [elections, setElections] = useState<HistElection[]>([])
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
    results: { listName: string; candidateMayor: string; votes: number; percentage: number; seats: number | null; listLogoUrl: string | null }[]
  } | null>(null)

  useEffect(() => {
    fetch('/api/persons')
      .then(r => r.json())
      .then((data: PersonOpt[]) => setPersons(Array.isArray(data) ? data : []))
      .catch(() => setPersons([]))
  }, [])

  async function load() {
    const res = await fetch('/api/historical')
    setElections(await res.json())
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
          const rows = parseHistoricalExcel(buf)
          if (!rows.length) {
            setImportErr('Nessuna riga valida nel file. Usa il foglio «Risultati» del modello.')
            return
          }
          setResultLines(historicalRowsToSemicolonLines(rows))
          setMsg('Dati importati dal file. Controlla il riepilogo sotto e premi Salva.')
        } catch {
          setImportErr('Impossibile leggere il file. Scarica il modello e salva in formato .xlsx.')
        }
      })
      .catch(() => setImportErr('Lettura file non riuscita.'))
    if (fileRef.current) fileRef.current.value = ''
  }

  async function save() {
    setSaving(true)
    setMsg('')
    // Parse result lines: listName;coalition;candidateMayor;votes;percentage;seats
    const results = resultLines.trim().split('\n').filter(Boolean).map(line => {
      const [listName, coalition, candidateMayor, votes, percentage, seats] = line.split(';').map(s => s.trim())
      return { listName, coalition: coalition || null, candidateMayor: candidateMayor || null, votes: parseInt(votes) || 0, percentage: parseFloat(percentage) || 0, seats: seats ? parseInt(seats) : null }
    })
    const res = await fetch('/api/historical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, year: parseInt(form.year), results }),
    })
    if (res.ok) {
      setMsg('Elezione storica salvata')
      setForm({ name: '', commune: '', year: String(new Date().getFullYear() - 5), notes: '' })
      setResultLines('')
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
      const res = await fetch('/api/historical/import-eligendo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: eligendoUrl.trim(), preview: true }),
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
        results: data.results,
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
      const res = await fetch('/api/historical/import-eligendo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: eligendoUrl.trim(), preview: false }),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportErr(data.error || 'Salvataggio non riuscito')
        return
      }
      const n = data.election?.results?.length ?? 0
      setMsg(`Elezione storica creata con ${n} liste (fonte Eligendo).`)
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
          . Verranno letti comune, anno, liste, voti, percentuali, seggi e simboli (URL immagini).
        </p>
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
              disabled={eligendoBusy}
              onClick={() => confirmEligendoImport()}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Conferma import
            </button>
          )}
        </div>
        {eligendoPreview && (
          <div className="mt-4 text-sm text-indigo-900 space-y-2">
            <p>
              <strong>{eligendoPreview.name}</strong> · {eligendoPreview.commune} · {eligendoPreview.year}
            </p>
            <p className="text-xs text-indigo-700 break-all">{eligendoPreview.titleRaw}</p>
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
                Puoi compilare il <strong>modello Excel</strong> (stesse colonne del testo sotto) oppure incollare righe separate da punto e virgola.
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
            <button onClick={save} disabled={!form.name || !form.commune || saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              {saving ? 'Salvataggio...' : 'Salva elezione storica'}
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
                <div className="border-t border-gray-100 p-4">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="text-left pb-2 w-10"> </th>
                      <th className="text-left pb-2">Lista</th>
                      <th className="text-left pb-2">Coalizione</th>
                      <th className="text-left pb-2">Sindaco (testo)</th>
                      <th className="text-left pb-2 min-w-[180px]">Anagrafica sindaco</th>
                      <th className="text-right pb-2">Voti</th>
                      <th className="text-right pb-2">%</th>
                      <th className="text-right pb-2">Seggi</th>
                    </tr></thead>
                    <tbody>
                      {e.results.map(r => (
                        <tr key={r.id} className="border-b border-gray-50 last:border-0">
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
                          <td className="py-1.5 font-medium">{r.listName}</td>
                          <td className="py-1.5 text-gray-500">{r.coalition || '—'}</td>
                          <td className="py-1.5 text-gray-600">{r.candidateMayor || '—'}</td>
                          <td className="py-1.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <select
                                value={r.mayorPersonId ?? ''}
                                onChange={async ev => {
                                  const v = ev.target.value
                                  await fetch(`/api/historical/results/${r.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ mayorPersonId: v ? parseInt(v, 10) : null }),
                                  })
                                  load()
                                }}
                                className="text-xs border border-gray-200 rounded px-1 py-1 max-w-[160px]"
                              >
                                <option value="">—</option>
                                {persons.map(p => (
                                  <option key={p.id} value={p.id}>{p.lastName} {p.firstName}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="text-xs text-indigo-600 whitespace-nowrap"
                                onClick={async () => {
                                  if (!r.candidateMayor?.trim()) return
                                  const res = await fetch(`/api/persons/suggestions?mayorLabel=${encodeURIComponent(r.candidateMayor)}`)
                                  const data = await res.json()
                                  if (data.persons?.length === 1) {
                                    await fetch(`/api/historical/results/${r.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ mayorPersonId: data.persons[0].id }),
                                    })
                                    load()
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
                                      await fetch(`/api/historical/results/${r.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ mayorPersonId: p.id }),
                                      })
                                      const prs = await fetch('/api/persons')
                                      setPersons(await prs.json())
                                      load()
                                    }
                                  } else {
                                    window.alert(`${data.persons.length} omonimi: scegli dal menu.`)
                                  }
                                }}
                              >
                                Suggerisci
                              </button>
                            </div>
                          </td>
                          <td className="py-1.5 text-right">{r.votes.toLocaleString('it-IT')}</td>
                          <td className="py-1.5 text-right">{r.percentage.toFixed(1)}%</td>
                          <td className="py-1.5 text-right text-gray-700">{r.seats ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
