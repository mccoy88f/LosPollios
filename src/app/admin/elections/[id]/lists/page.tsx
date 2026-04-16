'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { DEFAULT_COLORS } from '@/lib/utils'

interface Candidate { id: number; firstName: string; lastName: string; order: number; gender: string | null }
interface ElectionList {
  id: number; name: string; shortName: string | null; color: string
  candidateMayor: string | null; coalition: string | null; order: number
  candidates: Candidate[]
}

const emptyList = { name: '', shortName: '', color: DEFAULT_COLORS[0], candidateMayor: '', coalition: '', order: '0', notes: '' }

export default function ListsPage() {
  const { id } = useParams<{ id: string }>()
  const [lists, setLists] = useState<ElectionList[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...emptyList })
  const [editId, setEditId] = useState<number | null>(null)
  const [expandId, setExpandId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [newCand, setNewCand] = useState<Record<number, { firstName: string; lastName: string; order: string; gender: string }>>({})

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function load() {
    const res = await fetch(`/api/elections/${id}/lists`)
    setLists(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  async function saveList() {
    setSaving(true)
    const method = editId ? 'PUT' : 'POST'
    const url = editId ? `/api/elections/${id}/lists/${editId}` : `/api/elections/${id}/lists`
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, order: parseInt(form.order) || 0 }),
    })
    setForm({ ...emptyList })
    setEditId(null)
    setSaving(false)
    load()
  }

  async function deleteList(listId: number) {
    if (!confirm('Eliminare questa lista e tutti i candidati?')) return
    await fetch(`/api/elections/${id}/lists/${listId}`, { method: 'DELETE' })
    load()
  }

  async function addCandidate(listId: number) {
    const c = newCand[listId]
    if (!c?.firstName || !c?.lastName) return
    setSaving(true)
    await fetch(`/api/elections/${id}/lists/${listId}/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: c.firstName, lastName: c.lastName, order: parseInt(c.order) || 0, gender: c.gender || null }),
    })
    setNewCand(m => ({ ...m, [listId]: { firstName: '', lastName: '', order: '', gender: '' } }))
    setSaving(false)
    load()
  }

  async function deleteCandidate(listId: number, candId: number) {
    await fetch(`/api/elections/${id}/lists/${listId}/candidates/${candId}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/admin/elections/${id}`} className="text-blue-600 hover:text-blue-800 text-sm">← Elezione</Link>
        <h1 className="text-xl font-bold text-gray-900">Liste & Candidati</h1>
      </div>

      {/* Add/edit list form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">{editId ? 'Modifica lista' : 'Aggiungi lista'}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            ['Nome lista *', 'name', 'text', 'es. Lista Civica Progresso'],
            ['Sigla', 'shortName', 'text', 'es. LCP'],
            ['Candidato Sindaco', 'candidateMayor', 'text', 'Nome Cognome'],
            ['Coalizione', 'coalition', 'text', 'es. Centro-Sinistra'],
            ['Ordine scheda', 'order', 'number', '1'],
          ].map(([label, key, type, placeholder]) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input type={type} value={(form as Record<string, string>)[key]} onChange={e => setF(key, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Colore</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => setF('color', e.target.value)}
                className="w-10 h-9 border border-gray-300 rounded cursor-pointer" />
              <div className="flex gap-1 flex-wrap">
                {DEFAULT_COLORS.map(c => (
                  <button key={c} onClick={() => setF('color', c)}
                    className="w-5 h-5 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: form.color === c ? '#1d4ed8' : 'transparent' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={saveList} disabled={!form.name || saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
            {editId ? 'Aggiorna' : 'Aggiungi lista'}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setForm({ ...emptyList }) }}
              className="border border-gray-300 px-5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Annulla
            </button>
          )}
        </div>
      </div>

      {/* Lists */}
      {loading ? (
        <p className="text-gray-400 text-center py-8">Caricamento...</p>
      ) : lists.length === 0 ? (
        <p className="text-gray-400 text-center py-8">Nessuna lista configurata</p>
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <div key={list.id} className="bg-white rounded-xl border border-gray-200">
              {/* List header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                  <div>
                    <span className="font-semibold text-gray-900">{list.name}</span>
                    {list.shortName && <span className="text-gray-400 text-sm ml-2">({list.shortName})</span>}
                    {list.candidateMayor && <span className="text-gray-500 text-sm ml-3">Sindaco: {list.candidateMayor}</span>}
                    {list.coalition && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded ml-3">{list.coalition}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{list.candidates.length} candidati</span>
                  <button onClick={() => { setEditId(list.id); setForm({ name: list.name, shortName: list.shortName || '', color: list.color, candidateMayor: list.candidateMayor || '', coalition: list.coalition || '', order: String(list.order), notes: '' }) }}
                    className="text-blue-600 text-xs hover:text-blue-800 font-medium">Modifica</button>
                  <button onClick={() => setExpandId(expandId === list.id ? null : list.id)}
                    className="text-indigo-600 text-xs hover:text-indigo-800 font-medium">
                    {expandId === list.id ? 'Chiudi' : 'Candidati'}
                  </button>
                  <button onClick={() => deleteList(list.id)} className="text-red-400 text-xs hover:text-red-600 font-medium">Elimina</button>
                </div>
              </div>

              {/* Candidates panel */}
              {expandId === list.id && (
                <div className="border-t border-gray-100 p-4">
                  <table className="w-full text-sm mb-4">
                    <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="pb-2 w-10">#</th><th className="pb-2">Cognome</th><th className="pb-2">Nome</th><th className="pb-2">Sesso</th><th className="pb-2"></th>
                    </tr></thead>
                    <tbody>
                      {list.candidates.map(c => (
                        <tr key={c.id} className="border-b border-gray-50">
                          <td className="py-1.5 text-gray-400 text-xs">{c.order}</td>
                          <td className="py-1.5 font-medium">{c.lastName}</td>
                          <td className="py-1.5">{c.firstName}</td>
                          <td className="py-1.5 text-gray-400">{c.gender || '—'}</td>
                          <td className="py-1.5 text-right">
                            <button onClick={() => deleteCandidate(list.id, c.id)} className="text-red-400 hover:text-red-600 text-xs">Elimina</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Add candidate */}
                  <div className="flex gap-2 flex-wrap items-end">
                    {[['#', 'order', '1', 'w-14'], ['Cognome', 'lastName', 'Rossi', 'w-32'], ['Nome', 'firstName', 'Mario', 'w-32'], ['Sesso', 'gender', 'M/F', 'w-16']].map(([label, key, placeholder, w]) => (
                      <div key={key}>
                        <label className="block text-xs text-gray-400 mb-1">{label}</label>
                        <input value={(newCand[list.id] || {})[key as keyof typeof newCand[number]] || ''} placeholder={placeholder}
                          onChange={e => setNewCand(m => ({ ...m, [list.id]: { ...(m[list.id] || { firstName: '', lastName: '', order: '', gender: '' }), [key]: e.target.value } }))}
                          className={`border border-gray-300 rounded px-2 py-1.5 text-sm ${w} focus:outline-none focus:ring-1 focus:ring-blue-500`} />
                      </div>
                    ))}
                    <button onClick={() => addCandidate(list.id)} disabled={saving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium">
                      + Aggiungi
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
