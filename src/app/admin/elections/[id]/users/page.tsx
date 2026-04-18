'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface User { id: number; username: string; name: string | null; role: string; listId: number | null; active: boolean }
interface ElectionList { id: number; name: string }

export default function UsersPage() {
  const { id } = useParams<{ id: string }>()
  const [users, setUsers] = useState<User[]>([])
  const [lists, setLists] = useState<ElectionList[]>([])
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'entry', listId: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function load() {
    const [u, l] = await Promise.all([
      fetch(`/api/elections/${id}/users`).then(r => r.json()),
      fetch(`/api/elections/${id}/lists`).then(r => r.json()),
    ])
    setUsers(u)
    setLists(l)
  }
  useEffect(() => { load() }, [id])

  async function createUser() {
    setSaving(true)
    const res = await fetch(`/api/elections/${id}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, listId: form.listId ? parseInt(form.listId) : null }),
    })
    if (res.ok) {
      setMsg('Utente creato')
      setForm({ username: '', password: '', name: '', role: 'entry', listId: '' })
    } else {
      const d = await res.json()
      setMsg(d.error || 'Errore')
    }
    setSaving(false)
    load()
  }

  async function toggleActive(userId: number, active: boolean) {
    await fetch(`/api/elections/${id}/users`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, active: !active }),
    })
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
        <span className="text-gray-900 font-medium">Accessi</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestione accessi</h1>

      {msg && <div className="bg-blue-50 text-blue-700 text-sm rounded-lg px-4 py-2 mb-4">{msg}</div>}

      {/* Create user */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Nuovo utente</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[['Username *', 'username', 'text', 'es. lista1rep'], ['Password *', 'password', 'password', ''], ['Nome', 'name', 'text', 'Nome completo']].map(([label, key, type, ph]) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{label}</label>
              <input type={type} value={(form as Record<string, string>)[key]} onChange={e => setF(key, e.target.value)}
                placeholder={ph}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ruolo</label>
            <select value={form.role} onChange={e => setF('role', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="entry">Inserimento dati</option>
              <option value="viewer">Solo visualizzazione</option>
              <option value="admin">Amministratore</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lista associata</label>
            <select value={form.listId} onChange={e => setF('listId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Nessuna lista specifica —</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button onClick={createUser} disabled={!form.username || !form.password || saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium">
            Crea utente
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Gli utenti &quot;Inserimento dati&quot; possono accedere alla pagina entry e inserire i risultati di qualsiasi sezione.
        </p>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Username</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Nome</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Ruolo</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Lista</th>
              <th className="text-center px-4 py-3 text-gray-600 font-medium">Stato</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-mono text-sm">{u.username}</td>
                <td className="px-4 py-3 text-gray-700">{u.name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'entry' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{lists.find(l => l.id === u.listId)?.name || '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.active ? 'Attivo' : 'Disabilitato'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => toggleActive(u.id, u.active)}
                    className={`text-xs font-medium ${u.active ? 'text-red-400 hover:text-red-600' : 'text-green-600 hover:text-green-800'}`}>
                    {u.active ? 'Disabilita' : 'Abilita'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nessun utente configurato</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
