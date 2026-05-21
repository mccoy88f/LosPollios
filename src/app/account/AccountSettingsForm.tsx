'use client'

import { useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardTitle } from '@/components/ui/Card'
import { applyThemePreference, persistThemeCookie } from '@/lib/themeClient'
import type { ThemePreference } from '@/lib/theme'

type Profile = {
  username: string
  name: string | null
  role: string
  themePreference: ThemePreference
  election: { name: string; commune: string } | null
  list: { name: string } | null
  allowedSectionIds: number[] | null
}

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'light', label: 'Chiaro', hint: 'Sfondo chiaro sempre' },
  { value: 'dark', label: 'Scuro', hint: 'Sfondo scuro sempre' },
  { value: 'system', label: 'Automatico', hint: 'Segue le impostazioni del dispositivo' },
]

const inputClass =
  'w-full border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500'

export function AccountSettingsForm({ initial }: { initial: Profile }) {
  const [name, setName] = useState(initial.name ?? '')
  const [themePreference, setThemePreference] = useState<ThemePreference>(initial.themePreference)
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

  function previewTheme(value: ThemePreference) {
    setThemePreference(value)
    applyThemePreference(value)
    persistThemeCookie(value)
  }

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
          themePreference,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Salvataggio non riuscito')
        return
      }
      setSuccess('Impostazioni aggiornate.')
      applyThemePreference(themePreference)
      persistThemeCookie(themePreference)
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
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Nome utente
            </label>
            <input
              type="text"
              value={initial.username}
              disabled
              className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-neutral-900/60 text-gray-600 dark:text-neutral-400"
            />
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
              Non modificabile. Per cambiarlo contatta l&apos;amministratore.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Nome visualizzato
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={120}
              className={inputClass}
              placeholder="Come comparirà nel menu utente"
            />
          </div>
          <div className="rounded-lg bg-gray-50 dark:bg-neutral-900/50 border border-gray-100 dark:border-neutral-700 px-3 py-2 text-sm text-gray-600 dark:text-neutral-300 space-y-1">
            <p>
              <span className="font-medium text-gray-700 dark:text-neutral-200">Ruolo:</span> {roleLabel}
            </p>
            {initial.election && (
              <p>
                <span className="font-medium text-gray-700 dark:text-neutral-200">Elezione:</span>{' '}
                {initial.election.name} ({initial.election.commune})
              </p>
            )}
            {initial.list && (
              <p>
                <span className="font-medium text-gray-700 dark:text-neutral-200">Lista associata:</span>{' '}
                {initial.list.name}
              </p>
            )}
            {initial.allowedSectionIds && initial.allowedSectionIds.length > 0 && (
              <p>
                <span className="font-medium text-gray-700 dark:text-neutral-200">Sezioni assegnate:</span>{' '}
                {initial.allowedSectionIds.length} sezioni
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-neutral-400 pt-1">
              Ruolo, elezione e sezioni sono gestiti dall&apos;amministratore.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Aspetto</CardTitle>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            Scegli come visualizzare l&apos;interfaccia. Con &quot;Automatico&quot; il tema segue il dispositivo.
          </p>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tema interfaccia">
            {THEME_OPTIONS.map(opt => {
              const selected = themePreference === opt.value
              return (
                <label
                  key={opt.value}
                  className={`cursor-pointer rounded-xl border-2 px-3 py-3 transition-colors ${
                    selected
                      ? 'border-brand-800 bg-brand-50 dark:bg-neutral-800 dark:border-brand-500'
                      : 'border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 hover:border-gray-300 dark:hover:border-neutral-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="themePreference"
                    value={opt.value}
                    checked={selected}
                    onChange={() => previewTheme(opt.value)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                    {opt.label}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{opt.hint}</span>
                </label>
              )
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <CardTitle>Cambia password</CardTitle>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            Lascia vuoto se non vuoi modificare la password.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Password attuale
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Nuova password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Conferma nuova password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={inputClass}
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
