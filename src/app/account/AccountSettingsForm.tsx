'use client'

import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardTitle } from '@/components/ui/Card'

type Profile = {
  username: string
  name: string | null
  role: string
  election: { name: string; commune: string } | null
  list: { name: string } | null
  allowedSectionIds: number[] | null
}

export function AccountSettingsForm({ initial }: { initial: Profile }) {
  const [name, setName] = useState(initial.name ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const roleLabel =
    initial.role === 'admin'
      ? 'Amministratore'
      : initial.role === 'entry'
        ? 'Inserimento dati'
        : 'Sola visualizzazione'

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword && newPassword !== confirmPassword) {
      setError('Le password nuove non coincidono')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Salvataggio non riuscito')
        return
      }
      setSuccess('Impostazioni aggiornate.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setError('Errore di rete')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Profilo</CardTitle>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome utente</label>
            <input
              type="text"
              value={initial.username}
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">Non modificabile. Per cambiarlo contatta l&apos;amministratore.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome visualizzato</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={120}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              placeholder="Come comparirà nel menu utente"
            />
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium text-gray-700">Ruolo:</span> {roleLabel}
            </p>
            {initial.election && (
              <p>
                <span className="font-medium text-gray-700">Elezione:</span> {initial.election.name} ({initial.election.commune})
              </p>
            )}
            {initial.list && (
              <p>
                <span className="font-medium text-gray-700">Lista associata:</span> {initial.list.name}
              </p>
            )}
            {initial.allowedSectionIds && initial.allowedSectionIds.length > 0 && (
              <p>
                <span className="font-medium text-gray-700">Sezioni assegnate:</span>{' '}
                {initial.allowedSectionIds.length} sezioni
              </p>
            )}
            <p className="text-xs text-gray-500 pt-1">
              Ruolo, elezione e sezioni sono gestiti dall&apos;amministratore.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Cambia password</CardTitle>
          <p className="text-sm text-gray-500">Lascia vuoto se non vuoi modificare la password.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password attuale</label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuova password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conferma nuova password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            />
          </div>
        </CardBody>
      </Card>

      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? 'Salvataggio…' : 'Salva modifiche'}
      </Button>
    </form>
  )
}
