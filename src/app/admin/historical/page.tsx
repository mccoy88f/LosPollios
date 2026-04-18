'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HistResult { id: number; listName: string; coalition: string | null; candidateMayor: string | null; votes: number; percentage: number; seats: number | null }
interface HistElection { id: number; name: string; commune: string; year: number; notes: string | null; results: HistResult[] }

export default function HistoricalPage() {
  const [elections, setElections] = useState<HistElection[]>([])
  const [form, setForm] = useState({ name: '', commune: '', year: String(new Date().getFullYear() - 5), notes: '' })
  const [resultLines, setResultLines] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [expandId, setExpandId] = useState<number | null>(null)

  async function load() {
    const res = await fetch('/api/historical')
    setElections(await res.json())
  }
  useEffect(() => { load() }, [])

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm">← Admin</Link>
        <h1 className="text-xl font-bold text-gray-900">Elezioni storiche</h1>
      </div>

      {msg && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-2 mb-4">{msg}</div>}

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
            <div>
              <label className="block text-xs text-gray-500 mb-1">Risultati (una riga per lista)</label>
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
                      <th className="text-left pb-2">Lista</th>
                      <th className="text-left pb-2">Coalizione</th>
                      <th className="text-right pb-2">Voti</th>
                      <th className="text-right pb-2">%</th>
                      <th className="text-right pb-2">Seggi</th>
                    </tr></thead>
                    <tbody>
                      {e.results.map(r => (
                        <tr key={r.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-1.5 font-medium">{r.listName}</td>
                          <td className="py-1.5 text-gray-500">{r.coalition || '—'}</td>
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
