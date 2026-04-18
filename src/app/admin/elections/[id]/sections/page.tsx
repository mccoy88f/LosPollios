'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Section {
  id: number
  number: number
  name: string | null
  location: string | null
  theoreticalVoters: number
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

  async function load() {
    const res = await fetch(`/api/elections/${id}/sections`)
    setSections(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function bulkCreate() {
    setSaving(true)
    const n = parseInt(bulkCount)
    const v = parseInt(bulkVoters)
    if (!n || n < 1) return
    const secs = Array.from({ length: n }, (_, i) => ({
      number: i + 1, name: `Sezione ${i + 1}`, theoreticalVoters: v || 0,
    }))
    await fetch(`/api/elections/${id}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: secs }),
    })
    setBulkCount('')
    setBulkVoters('')
    setMsg(`${n} sezioni create`)
    setSaving(false)
    load()
  }

  async function addSection() {
    setSaving(true)
    await fetch(`/api/elections/${id}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newForm, number: parseInt(newForm.number), theoreticalVoters: parseInt(newForm.theoreticalVoters) || 0 }),
    })
    setNewForm({ number: '', name: '', location: '', theoreticalVoters: '' })
    setSaving(false)
    load()
  }

  async function saveEdit(secId: number) {
    setSaving(true)
    await fetch(`/api/elections/${id}/sections/${secId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, theoreticalVoters: parseInt(editForm.theoreticalVoters) || 0 }),
    })
    setEditId(null)
    setSaving(false)
    load()
  }

  async function deleteSection(secId: number) {
    if (!confirm('Eliminare questa sezione?')) return
    await fetch(`/api/elections/${id}/sections/${secId}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/elections/${id}`} className="text-blue-600 hover:text-blue-800 text-sm">← Elezione</Link>
        <h1 className="text-xl font-bold text-gray-900">Sezioni elettorali</h1>
      </div>

      {msg && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-2 mb-4">{msg}</div>}

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
            <label className="block text-xs text-gray-500 mb-1">Votanti teorici (per sezione)</label>
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
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Teorici</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Reali</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Caricamento...</td></tr>
            ) : sections.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nessuna sezione</td></tr>
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
          {[['N.', 'number', '1'], ['Nome', 'name', 'Sezione 1'], ['Luogo', 'location', 'Via ...'], ['Votanti', 'theoreticalVoters', '800']].map(([label, key, placeholder]) => (
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
