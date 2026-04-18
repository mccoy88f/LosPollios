'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PersonRow {
  id: number
  firstName: string
  lastName: string
  notes: string | null
  _count: { candidates: number; mayorForLists: number; historicalMayors: number }
}

export default function PersonsPage() {
  const [persons, setPersons] = useState<PersonRow[]>([])
  const [form, setForm] = useState({ firstName: '', lastName: '', notes: '' })
  const [msg, setMsg] = useState('')
  const [expandId, setExpandId] = useState<number | null>(null)
  const [trail, setTrail] = useState<{ kind: string; label: string; detail: string; year?: number }[] | null>(null)

  async function load() {
    const res = await fetch('/api/persons')
    if (res.ok) setPersons(await res.json())
  }
  useEffect(() => { load() }, [])

  async function createPerson(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    const res = await fetch('/api/persons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg(data.id ? `Anagrafica #${data.id} pronta` : 'Salvata')
      setForm({ firstName: '', lastName: '', notes: '' })
      load()
    } else setMsg(data.error || 'Errore')
  }

  async function openTrail(id: number) {
    if (expandId === id) {
      setExpandId(null)
      setTrail(null)
      return
    }
    setExpandId(id)
    const res = await fetch(`/api/persons/${id}`)
    const data = await res.json()
    setTrail(data.timeline || [])
  }

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link href="/admin" className="text-blue-600 hover:underline">
          Elezioni
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Anagrafica candidati</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Anagrafica candidati</h1>
      <p className="text-sm text-gray-600 mb-6 max-w-2xl">
        Collega la stessa persona tra elezioni diverse (candidato consigliere oggi, sindaco di lista ieri).
        Dalle pagine <strong>Liste e candidati</strong> e <strong>Dati storici</strong> puoi associare ogni figura a un&apos;anagrafica;
        i suggerimenti usano nome e cognome uguali.
      </p>

      {msg && <div className="bg-blue-50 text-blue-800 text-sm rounded-lg px-4 py-2 mb-4">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={createPerson} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Nuova anagrafica</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome</label>
            <input
              required
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cognome</label>
            <input
              required
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Note (opz.)</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="es. ex sindaco, professione…"
            />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Crea / trova omonimo
          </button>
          <p className="text-xs text-gray-400">
            Se esiste già stesso nome e cognome (ignorando maiuscole), viene riutilizzato il record esistente.
          </p>
        </form>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-900">Elenco ({persons.length})</div>
          <ul className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
            {persons.map(p => (
              <li key={p.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-medium text-gray-900">
                      {p.lastName} {p.firstName}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">#{p.id}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      Consiglio: {p._count.candidates} · Sindaco lista: {p._count.mayorForLists} · Storico sindaco:{' '}
                      {p._count.historicalMayors}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openTrail(p.id)}
                    className="text-xs text-indigo-600 hover:underline shrink-0"
                  >
                    {expandId === p.id ? 'Chiudi cronologia' : 'Cronologia'}
                  </button>
                </div>
                {expandId === p.id && trail && (
                  <ul className="mt-3 text-xs text-gray-600 space-y-2 border-t border-gray-50 pt-3">
                    {trail.length === 0 && <li>Nessun collegamento ancora.</li>}
                    {trail.map((t, i) => (
                      <li key={i}>
                        <span className="text-gray-400">{t.year ?? '—'}</span> · {t.label}: {t.detail}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {persons.length === 0 && <li className="px-5 py-8 text-center text-gray-400 text-sm">Nessuna anagrafica</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
