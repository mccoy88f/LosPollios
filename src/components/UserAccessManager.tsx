'use client'

import { useCallback, useEffect, useState } from 'react'
import { confirmDelete } from '@/lib/confirmDelete'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Card, CardBody, CardTitle } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { SectionPicker, UserEditFields } from '@/components/UserEditFields'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { Pencil, Trash2 } from 'lucide-react'

type Section = { id: number; number: number; name: string | null }
type ElectionList = { id: number; name: string }
type Election = { id: number; name: string; commune: string }
type UserRow = {
  id: number
  username: string
  name: string | null
  role: string
  electionId: number | null
  listId: number | null
  active: boolean
  election: Election | null
  list: { id: number; name: string } | null
  sectionIds: number[]
  sections: Section[]
}

const emptyForm = {
  username: '',
  password: '',
  name: '',
  role: 'entry',
  electionId: '',
  listId: '',
  sectionIds: [] as number[],
}

export function UserAccessManager({
  electionId: fixedElectionId,
  showElectionPicker = false,
}: {
  /** Se impostato, crea/modifica utenti solo per questa elezione */
  electionId?: number
  showElectionPicker?: boolean
}) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [elections, setElections] = useState<Election[]>([])
  const [lists, setLists] = useState<ElectionList[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [form, setForm] = useState({ ...emptyForm, electionId: fixedElectionId ? String(fixedElectionId) : '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ ...emptyForm, password: '', active: true })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const editingUser = editingId != null ? users.find(u => u.id === editingId) : null

  const effectiveElectionId = fixedElectionId ?? (form.electionId ? Number(form.electionId) : null)
  const editElectionId =
    editingId != null
      ? (editForm.electionId ? Number(editForm.electionId) : fixedElectionId ?? null)
      : null

  const loadUsers = useCallback(async () => {
    const url = fixedElectionId
      ? `/api/elections/${fixedElectionId}/users`
      : `/api/admin/users${form.electionId && showElectionPicker ? `?electionId=${form.electionId}` : ''}`
    const res = await fetch(url)
    if (res.ok) setUsers(await res.json())
  }, [fixedElectionId, form.electionId, showElectionPicker])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  useEffect(() => {
    if (showElectionPicker) {
      fetch('/api/elections')
        .then(r => r.json())
        .then(setElections)
        .catch(() => {})
    }
  }, [showElectionPicker])

  useEffect(() => {
    const eid = editingId != null ? editElectionId : effectiveElectionId
    if (!eid) {
      setLists([])
      setSections([])
      return
    }
    Promise.all([
      fetch(`/api/elections/${eid}/lists`).then(r => r.json()),
      fetch(`/api/elections/${eid}/sections`).then(r => r.json()),
    ]).then(([l, s]) => {
      setLists(l)
      setSections(s.map((x: { id: number; number: number; name: string | null }) => ({ id: x.id, number: x.number, name: x.name })))
    })
  }, [effectiveElectionId, editElectionId, editingId])

  function setF(k: string, v: string | number[] | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }
  function setEf(k: string, v: string | number[] | boolean) {
    setEditForm(f => ({ ...f, [k]: v }))
  }

  async function createUser() {
    setSaving(true)
    setMsg('')
    const url = fixedElectionId ? `/api/elections/${fixedElectionId}/users` : '/api/admin/users'
    const body = {
      username: form.username,
      password: form.password,
      name: form.name || null,
      role: form.role,
      listId: form.listId ? Number(form.listId) : null,
      electionId: fixedElectionId ?? (form.electionId ? Number(form.electionId) : null),
      sectionIds: form.sectionIds,
    }
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await res.json()
    if (res.ok) {
      setMsg('Utente creato')
      setForm({ ...emptyForm, electionId: fixedElectionId ? String(fixedElectionId) : '', sectionIds: [] })
      void loadUsers()
    } else setMsg(d.error || 'Errore')
    setSaving(false)
  }

  function startEdit(u: UserRow) {
    setEditingId(u.id)
    setEditForm({
      username: u.username,
      password: '',
      name: u.name || '',
      role: u.role,
      electionId: u.electionId != null ? String(u.electionId) : fixedElectionId ? String(fixedElectionId) : '',
      listId: u.listId != null ? String(u.listId) : '',
      sectionIds: [...u.sectionIds],
      active: u.active,
    })
  }

  async function saveEdit() {
    if (editingId == null) return
    setSaving(true)
    setMsg('')
    const url = fixedElectionId
      ? `/api/elections/${fixedElectionId}/users`
      : `/api/admin/users/${editingId}`
    const body: Record<string, unknown> = {
      ...(fixedElectionId ? { userId: editingId } : {}),
      username: editForm.username,
      name: editForm.name || null,
      role: editForm.role,
      listId: editForm.listId ? Number(editForm.listId) : null,
      active: editForm.active,
      sectionIds: editForm.sectionIds,
    }
    if (!fixedElectionId) {
      body.electionId = editForm.electionId ? Number(editForm.electionId) : null
    }
    if (editForm.password) body.password = editForm.password

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    if (res.ok) {
      setMsg('Utente aggiornato')
      setEditingId(null)
      void loadUsers()
    } else setMsg(d.error || 'Errore')
    setSaving(false)
  }

  async function removeUser(u: UserRow) {
    if (!confirmDelete(`Eliminare l'account "${u.username}"?`)) return
    const url = fixedElectionId ? `/api/elections/${fixedElectionId}/users` : `/api/admin/users/${u.id}`
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id }),
    })
    if (res.ok) {
      setMsg('Utente eliminato')
      void loadUsers()
    } else {
      const d = await res.json()
      setMsg(d.error || 'Errore')
    }
  }

  return (
    <div className="space-y-6">
      {msg && <Alert variant="info">{msg}</Alert>}

      <Card>
        <CardBody>
        <CardTitle className="mb-4">Nuovo utente</CardTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[['Username *', 'username', 'text'], ['Password *', 'password', 'password'], ['Nome', 'name', 'text']].map(
            ([label, key, type]) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as 'username' | 'password' | 'name']}
                  onChange={e => setF(key, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ruolo</label>
            <select
              value={form.role}
              onChange={e => setF('role', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="entry">Inserimento dati</option>
              <option value="viewer">Solo visualizzazione</option>
              <option value="admin">Amministratore</option>
            </select>
          </div>
          {showElectionPicker && !fixedElectionId && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Elezione</label>
              <select
                value={form.electionId}
                onChange={e => setF('electionId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Admin globale —</option>
                {elections.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.commune})
                  </option>
                ))}
              </select>
            </div>
          )}
          {form.role !== 'admin' && effectiveElectionId && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Lista associata</label>
              <select
                value={form.listId}
                onChange={e => setF('listId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">— Nessuna —</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {form.role !== 'admin' && effectiveElectionId && (
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">
              Sezioni consentite (vuoto = tutte le sezioni dell&apos;elezione)
            </label>
            <SectionPicker sections={sections} selected={form.sectionIds} onChange={ids => setF('sectionIds', ids)} />
          </div>
        )}
        <Button
          type="button"
          onClick={() => void createUser()}
          disabled={!form.username || !form.password || saving}
          className="mt-4"
        >
          Crea utente
        </Button>
        </CardBody>
      </Card>

      {/* Mobile: elenco card */}
      <div className="lg:hidden space-y-3">
        {users.map(u => (
          <Card key={u.id}>
            <CardBody className="py-4 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-mono font-medium text-gray-900">{u.username}</p>
                  <p className="text-sm text-gray-600">{u.name || '—'}</p>
                  <p className="text-xs text-gray-500">{u.role}{u.list ? ` · ${u.list.name}` : ''}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}
                >
                  {u.active ? 'Attivo' : 'Off'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Sezioni: {u.sectionIds.length === 0 ? 'Tutte' : u.sections.map(s => s.number).join(', ')}
              </p>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => startEdit(u)}>
                  Modifica
                </Button>
                <Button type="button" variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => void removeUser(u)}>
                  Elimina
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
        {users.length === 0 && <p className="text-center text-gray-400 py-8">Nessun utente</p>}
      </div>

      <Card className="hidden lg:block overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Username</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Nome / Ruolo</th>
              {!fixedElectionId && <th className="text-left px-4 py-3 text-gray-600 font-medium">Elezione</th>}
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Sezioni</th>
              <th className="text-center px-4 py-3 text-gray-600 font-medium">Stato</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-100 last:border-0 align-top">
                {isDesktop && editingId === u.id ? (
                  <td colSpan={fixedElectionId ? 5 : 6} className="px-4 py-4 bg-gray-50">
                    <UserEditFields
                      form={editForm}
                      setField={setEf}
                      sections={sections}
                      lists={lists}
                      elections={elections}
                      showElectionPicker={showElectionPicker}
                      fixedElectionId={fixedElectionId}
                      editElectionId={editElectionId}
                      showActiveToggle
                      saving={saving}
                      onSave={() => void saveEdit()}
                      onCancel={() => setEditingId(null)}
                    />
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 font-mono">{u.username}</td>
                    <td className="px-4 py-3">
                      <div>{u.name || '—'}</div>
                      <span className="text-xs text-gray-500">{u.role}</span>
                      {u.list && <div className="text-xs text-gray-400">Lista: {u.list.name}</div>}
                    </td>
                    {!fixedElectionId && (
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {u.election ? u.election.name : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {u.sectionIds.length === 0
                        ? 'Tutte'
                        : u.sections.map(s => s.number).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {u.active ? 'Attivo' : 'Off'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={<Pencil className="w-3.5 h-3.5" />}
                          onClick={() => startEdit(u)}
                        >
                          Modifica
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => void removeUser(u)}
                        >
                          Elimina
                        </Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={fixedElectionId ? 5 : 6} className="text-center py-8 text-gray-400">
                  Nessun utente
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Drawer
        open={!isDesktop && editingId != null}
        onClose={() => setEditingId(null)}
        title={editingUser ? `Modifica · ${editingUser.username}` : 'Modifica utente'}
      >
        {editingId != null && (
          <UserEditFields
            form={editForm}
            setField={setEf}
            sections={sections}
            lists={lists}
            elections={elections}
            showElectionPicker={showElectionPicker}
            fixedElectionId={fixedElectionId}
            editElectionId={editElectionId}
            showActiveToggle
            saving={saving}
            onSave={() => void saveEdit()}
            onCancel={() => setEditingId(null)}
          />
        )}
      </Drawer>

      <p className="text-xs text-gray-500">
        Gli utenti «Inserimento» senza sezioni selezionate possono accedere a tutte le sezioni dell&apos;elezione assegnata.
        Con una o più sezioni spuntate l&apos;accesso è limitato solo a quelle.
      </p>
    </div>
  )
}
