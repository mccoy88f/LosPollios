'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { DEFAULT_COLORS } from '@/lib/utils'

interface PersonMini { id: number; firstName: string; lastName: string }
interface Candidate {
  id: number
  firstName: string
  lastName: string
  order: number
  gender: string | null
  personId?: number | null
  person?: PersonMini | null
}
interface ElectionList {
  id: number
  name: string
  shortName: string | null
  color: string
  listLogoUrl?: string | null
  coalitionLogoUrl?: string | null
  candidateMayor: string | null
  coalition: string | null
  order: number
  mayorPersonId?: number | null
  mayorPerson?: PersonMini | null
  candidates: Candidate[]
}

const emptyList = {
  name: '',
  shortName: '',
  color: DEFAULT_COLORS[0],
  listLogoUrl: '',
  coalitionLogoUrl: '',
  candidateMayor: '',
  mayorPersonId: '',
  coalition: '',
  order: '0',
  notes: '',
}

export default function ListsPage() {
  const { id } = useParams<{ id: string }>()
  const [lists, setLists] = useState<ElectionList[]>([])
  const [persons, setPersons] = useState<PersonMini[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...emptyList })
  const [editId, setEditId] = useState<number | null>(null)
  const [expandId, setExpandId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [newCand, setNewCand] = useState<Record<number, { firstName: string; lastName: string; order: string; gender: string }>>({})

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function load() {
    const [lr, pr] = await Promise.all([
      fetch(`/api/elections/${id}/lists`).then(r => r.json()),
      fetch('/api/persons').then(r => r.json()),
    ])
    setLists(lr)
    setPersons(Array.isArray(pr) ? pr.map((p: PersonMini & { _count?: unknown }) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName })) : [])
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
      body: JSON.stringify({
        ...form,
        order: parseInt(form.order) || 0,
        mayorPersonId: form.mayorPersonId ? parseInt(form.mayorPersonId, 10) : null,
      }),
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

  async function suggestMayorPerson() {
    if (!form.candidateMayor.trim()) return
    const res = await fetch(`/api/persons/suggestions?mayorLabel=${encodeURIComponent(form.candidateMayor)}`)
    const data = await res.json()
    if (data.persons?.length === 1) {
      setForm(f => ({ ...f, mayorPersonId: String(data.persons[0].id) }))
    } else if (!data.persons?.length) {
      window.alert('Nessuna anagrafica con lo stesso nome. Creane una da «Anagrafica» nel menu oppure scegli a mano.')
    } else {
      window.alert(`${data.persons.length} anagrafiche possibili: scegli dal menu «Anagrafica sindaco».`)
    }
  }

  async function updateCandidatePerson(listId: number, candId: number, personId: string) {
    await fetch(`/api/elections/${id}/lists/${listId}/candidates/${candId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: personId ? parseInt(personId, 10) : null }),
    })
    load()
  }

  async function suggestCandidatePerson(c: Candidate, listId: number) {
    const res = await fetch(
      `/api/persons/suggestions?firstName=${encodeURIComponent(c.firstName)}&lastName=${encodeURIComponent(c.lastName)}`
    )
    const data = await res.json()
    if (data.persons?.length === 1) {
      await fetch(`/api/elections/${id}/lists/${listId}/candidates/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: data.persons[0].id }),
      })
      load()
    } else if (!data.persons?.length) {
      if (!window.confirm(`Creare anagrafica «${c.firstName} ${c.lastName}» e collegarla?`)) return
      const pr = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: c.firstName, lastName: c.lastName }),
      })
      const p = await pr.json()
      if (p.id) {
        await fetch(`/api/elections/${id}/lists/${listId}/candidates/${c.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: p.id }),
        })
        load()
      }
    } else {
      window.alert(`${data.persons.length} omonimi in anagrafica: scegli dal menu Persona.`)
    }
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
        <span className="text-gray-900 font-medium">Liste e candidati</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Liste e candidati</h1>

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
          <div className="col-span-2 md:col-span-3">
            <label className="block text-xs text-gray-500 mb-1">Anagrafica sindaco (tracciamento nel tempo)</label>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={form.mayorPersonId}
                onChange={e => setF('mayorPersonId', e.target.value)}
                className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Nessuna —</option>
                {persons.map(p => (
                  <option key={p.id} value={p.id}>{p.lastName} {p.firstName}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => suggestMayorPerson()}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
              >
                Suggerisci da nome sindaco
              </button>
            </div>
          </div>
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
          <div className="col-span-2 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">URL logo lista (simbolo)</label>
              <input
                type="url"
                value={form.listLogoUrl}
                onChange={e => setF('listLogoUrl', e.target.value)}
                placeholder="https://…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">URL logo coalizione (opz.)</label>
              <input
                type="url"
                value={form.coalitionLogoUrl}
                onChange={e => setF('coalitionLogoUrl', e.target.value)}
                placeholder="Stesso URL per tutte le liste della coalizione"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                  {list.listLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={list.listLogoUrl} alt="" className="w-10 h-10 object-contain rounded border border-gray-100 bg-white" />
                  ) : (
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                  )}
                  {list.coalitionLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={list.coalitionLogoUrl} alt="" title="Coalizione" className="w-8 h-8 object-contain rounded opacity-90" />
                  ) : null}
                  <div>
                    <span className="font-semibold text-gray-900">{list.name}</span>
                    {list.shortName && <span className="text-gray-400 text-sm ml-2">({list.shortName})</span>}
                    {list.candidateMayor && <span className="text-gray-500 text-sm ml-3">Sindaco: {list.candidateMayor}</span>}
                    {list.mayorPerson && (
                      <span className="text-indigo-700 text-xs ml-2 bg-indigo-50 px-2 py-0.5 rounded">
                        Anagrafica: {list.mayorPerson.lastName} {list.mayorPerson.firstName}
                      </span>
                    )}
                    {list.coalition && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded ml-3">{list.coalition}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{list.candidates.length} candidati</span>
                  <button onClick={() => { setEditId(list.id); setForm({ name: list.name, shortName: list.shortName || '', color: list.color, listLogoUrl: list.listLogoUrl || '', coalitionLogoUrl: list.coalitionLogoUrl || '', candidateMayor: list.candidateMayor || '', mayorPersonId: list.mayorPersonId ? String(list.mayorPersonId) : '', coalition: list.coalition || '', order: String(list.order), notes: '' }) }}
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
                      <th className="pb-2 w-10">#</th><th className="pb-2">Cognome</th><th className="pb-2">Nome</th><th className="pb-2">Sesso</th>
                      <th className="pb-2 min-w-[160px]">Anagrafica</th><th className="pb-2"></th>
                    </tr></thead>
                    <tbody>
                      {list.candidates.map(c => (
                        <tr key={c.id} className="border-b border-gray-50">
                          <td className="py-1.5 text-gray-400 text-xs">{c.order}</td>
                          <td className="py-1.5 font-medium">{c.lastName}</td>
                          <td className="py-1.5">{c.firstName}</td>
                          <td className="py-1.5 text-gray-400">{c.gender || '—'}</td>
                          <td className="py-1.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <select
                                value={c.personId ?? ''}
                                onChange={e => updateCandidatePerson(list.id, c.id, e.target.value)}
                                className="text-xs border border-gray-200 rounded px-1 py-1 max-w-[140px]"
                              >
                                <option value="">—</option>
                                {persons.map(p => (
                                  <option key={p.id} value={p.id}>{p.lastName} {p.firstName}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => suggestCandidatePerson(c, list.id)}
                                className="text-indigo-600 text-xs whitespace-nowrap"
                              >
                                Suggerisci
                              </button>
                            </div>
                          </td>
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
