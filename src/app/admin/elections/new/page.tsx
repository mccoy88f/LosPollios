'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewElectionPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', commune: '', date: '', type: 'large', totalSeats: '32', threshold: '3.0', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/elections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, totalSeats: Number(form.totalSeats), threshold: Number(form.threshold) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Errore'); return }
      router.push(`/admin/elections/${data.id}`)
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800">← Elezioni</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuova elezione</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome elezione *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="es. Elezioni Comunali 2025" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comune *</label>
            <input value={form.commune} onChange={e => set('commune', e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="es. Comune di Roma" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo comune</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="large">Grande (&gt;15.000 ab.) – doppio turno</option>
              <option value="small">Piccolo (&le;15.000 ab.) – turno unico</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seggi consiglio</label>
            <input type="number" min="1" value={form.totalSeats} onChange={e => set('totalSeats', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {form.type === 'large' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Soglia sbarramento (%)</label>
              <input type="number" step="0.1" min="0" max="10" value={form.threshold} onChange={e => set('threshold', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Note opzionali..." />
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
            {loading ? 'Creazione...' : 'Crea elezione'}
          </button>
          <Link href="/admin" className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            Annulla
          </Link>
        </div>
      </form>
    </div>
  )
}
