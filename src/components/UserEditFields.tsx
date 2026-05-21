'use client'

import { Button } from '@/components/ui/Button'
import { formFieldClass } from '@/lib/formFieldStyles'

type Section = { id: number; number: number; name: string | null }
type ElectionList = { id: number; name: string }
type Election = { id: number; name: string; commune: string }

export type UserFormState = {
  username: string
  password: string
  name: string
  role: string
  electionId: string
  listId: string
  sectionIds: number[]
  active?: boolean
}

export function SectionPicker({
  sections,
  selected,
  onChange,
  disabled,
}: {
  sections: Section[]
  selected: number[]
  onChange: (ids: number[]) => void
  disabled?: boolean
}) {
  if (sections.length === 0) {
    return <p className="text-xs text-gray-400">Seleziona un&apos;elezione per scegliere le sezioni.</p>
  }
  return (
    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-gray-100 rounded-lg p-2">
      {sections.map(s => (
        <label key={s.id} className="inline-flex items-center gap-1 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={selected.includes(s.id)}
            disabled={disabled}
            onChange={() =>
              onChange(selected.includes(s.id) ? selected.filter(x => x !== s.id) : [...selected, s.id])
            }
          />
          Sez. {s.number}
          {s.name ? ` (${s.name})` : ''}
        </label>
      ))}
    </div>
  )
}

const inputClass = formFieldClass

export function UserEditFields({
  form,
  setField,
  sections,
  lists,
  elections,
  showElectionPicker,
  fixedElectionId,
  editElectionId,
  showActiveToggle,
  saving,
  onSave,
  onCancel,
}: {
  form: UserFormState
  setField: (key: string, value: string | number[] | boolean) => void
  sections: Section[]
  lists: ElectionList[]
  elections: Election[]
  showElectionPicker: boolean
  fixedElectionId?: number
  editElectionId: number | null
  showActiveToggle?: boolean
  saving: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Username</label>
          <input
            value={form.username}
            onChange={e => setField('username', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Password {showActiveToggle ? '(opz.)' : '*'}</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setField('password', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nome</label>
          <input value={form.name} onChange={e => setField('name', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ruolo</label>
          <select
            value={form.role}
            onChange={e => setField('role', e.target.value)}
            className={inputClass}
          >
            <option value="entry">Inserimento dati</option>
            <option value="viewer">Solo visualizzazione</option>
            <option value="admin">Amministratore</option>
          </select>
        </div>
        {showElectionPicker && !fixedElectionId && (
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Elezione</label>
            <select
              value={form.electionId}
              onChange={e => setField('electionId', e.target.value)}
              className={inputClass}
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
        {form.role !== 'admin' && editElectionId && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lista associata</label>
            <select
              value={form.listId}
              onChange={e => setField('listId', e.target.value)}
              className={inputClass}
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
      {form.role !== 'admin' && editElectionId && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Sezioni consentite (vuoto = tutte)
          </label>
          <SectionPicker
            sections={sections}
            selected={form.sectionIds}
            onChange={ids => setField('sectionIds', ids)}
          />
        </div>
      )}
      {showActiveToggle && (
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active ?? true}
            onChange={e => setField('active', e.target.checked)}
          />
          Account attivo
        </label>
      )}
      <div className="flex gap-2 pt-2">
        <Button type="button" onClick={onSave} disabled={saving}>
          Salva
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annulla
        </Button>
      </div>
    </div>
  )
}
