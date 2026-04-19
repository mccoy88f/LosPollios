'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toElectionDateInputValue } from '@/lib/utils'

type Initial = {
  name: string
  commune: string
  date: string | Date
  type: string
  totalSeats: number
  threshold: number
  notes: string | null
  /** Totale comunale (tetto): somma sezioni ≤ questo valore */
  eligibleVotersTotal: number | null
}

export default function ElectionMetadataForm({
  electionId,
  initial,
}: {
  electionId: number
  initial: Initial
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: initial.name,
    commune: initial.commune,
    date: typeof initial.date === 'string' ? initial.date : toElectionDateInputValue(initial.date),
    type: initial.type,
    totalSeats: String(initial.totalSeats),
    threshold: String(initial.threshold),
    notes: initial.notes ?? '',
    eligibleVotersTotal:
      initial.eligibleVotersTotal != null ? String(initial.eligibleVotersTotal) : '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    setSaved(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setLoading(true)
    try {
      const res = await fetch(`/api/elections/${electionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          commune: form.commune.trim(),
          date: form.date,
          type: form.type,
          totalSeats: Number(form.totalSeats),
          threshold: Number(form.threshold),
          notes: form.notes.trim() || null,
          eligibleVotersTotal:
            form.eligibleVotersTotal.trim() === '' ? null : Math.max(0, parseInt(form.eligibleVotersTotal, 10) || 0),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Salvataggio non riuscito')
        return
      }
      setSaved(true)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 pt-5 border-t border-gray-100 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Dati elezione</h3>
      <p className="text-xs text-gray-500">
        Nome, comune, data, tipo, seggi, soglia, note. Il <strong>totale comunale</strong> è il tetto: la somma degli aventi
        diritto sulle sezioni non può superarlo.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Totale aventi diritto al voto (comune){' '}
            <span className="font-normal text-gray-400">— tetto per la somma delle sezioni</span>
          </label>
          <input
            type="number"
            min={0}
            value={form.eligibleVotersTotal}
            onChange={e => set('eligibleVotersTotal', e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="es. 12.500 (vuoto = nessun limite)"
          />
          <p className="text-xs text-gray-400 mt-1">
            Lasciare vuoto se non vuoi un limite. Valore tipico: elettori registrati dal comune.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome elezione</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Comune</label>
          <input
            value={form.commune}
            onChange={e => set('commune', e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo comune</label>
          <select
            value={form.type}
            onChange={e => set('type', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="large">Grande (&gt;15.000 ab.) – doppio turno</option>
            <option value="small">Piccolo (&le;15.000 ab.) – turno unico</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Seggi consiglio</label>
          <input
            type="number"
            min={1}
            value={form.totalSeats}
            onChange={e => set('totalSeats', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {form.type === 'large' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Soglia sbarramento (%)</label>
            <input
              type="number"
              step="0.1"
              min={0}
              max={10}
              value={form.threshold}
              onChange={e => set('threshold', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Opzionali"
          />
        </div>
      </div>
      {error && <div className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
      {saved && !error && <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">Modifiche salvate.</div>}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? 'Salvataggio…' : 'Salva dati elezione'}
      </button>
    </form>
  )
}
