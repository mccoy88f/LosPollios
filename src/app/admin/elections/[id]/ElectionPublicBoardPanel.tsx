'use client'

import { useCallback, useEffect, useState } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import {
  PUBLIC_BOARD_REFRESH_MAX,
  PUBLIC_BOARD_REFRESH_MIN,
} from '@/lib/publicBoard'
import { Copy, ExternalLink, RefreshCw } from 'lucide-react'

const REFRESH_OPTIONS = [30, 60, 120, 180, 300].filter(
  s => s >= PUBLIC_BOARD_REFRESH_MIN && s <= PUBLIC_BOARD_REFRESH_MAX
)

export default function ElectionPublicBoardPanel({ electionId }: { electionId: number }) {
  const [enabled, setEnabled] = useState(false)
  const [refreshSeconds, setRefreshSeconds] = useState(60)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/elections/${electionId}/public-board`)
    if (res.ok) {
      const d = await res.json()
      setEnabled(d.enabled)
      setRefreshSeconds(d.refreshSeconds)
      setPublicUrl(d.publicUrl ? absoluteUrl(d.publicUrl) : null)
    }
    setLoading(false)
  }, [electionId])

  useEffect(() => {
    void load()
  }, [load])

  async function save(patch: {
    enabled?: boolean
    refreshSeconds?: number
    regenerateToken?: boolean
  }) {
    setSaving(true)
    setMsg('')
    const res = await fetch(`/api/elections/${electionId}/public-board`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const d = await res.json()
    if (res.ok) {
      setEnabled(d.enabled)
      setRefreshSeconds(d.refreshSeconds)
      setPublicUrl(d.publicUrl ? absoluteUrl(d.publicUrl) : null)
      setMsg(patch.regenerateToken ? 'Nuovo link generato.' : 'Impostazioni salvate.')
    } else {
      setMsg(d.error || 'Errore')
    }
    setSaving(false)
  }

  async function copyUrl() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setMsg('Copia non riuscita: seleziona il link manualmente.')
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Caricamento tabellone pubblico…</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-neutral-300">
        Pagina pubblica leggera (solo affluenza, stato sezioni e voti di lista). Nessuna connessione
        permanente: i visitatori aggiornano i dati a intervalli, con cache sul server per ridurre il
        carico anche con molte connessioni simultanee.
      </p>

      {msg && <Alert variant="info">{msg}</Alert>}

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={e => void save({ enabled: e.target.checked })}
          className="rounded border-gray-300"
        />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          Tabellone pubblico attivo
        </span>
      </label>

      <div>
        <label className="block text-xs text-gray-500 dark:text-neutral-400 mb-1">
          Intervallo aggiornamento (secondi)
        </label>
        <select
          value={refreshSeconds}
          disabled={saving || !enabled}
          onChange={e => {
            const v = Number(e.target.value)
            setRefreshSeconds(v)
            void save({ refreshSeconds: v })
          }}
          className="border border-gray-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-900"
        >
          {REFRESH_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s} secondi{s === 60 ? ' (consigliato)' : ''}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Minimo {PUBLIC_BOARD_REFRESH_MIN} s, massimo {PUBLIC_BOARD_REFRESH_MAX} s.
        </p>
      </div>

      {enabled && publicUrl && (
        <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-950 p-3 space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-neutral-400">Link pubblico</p>
          <p className="text-sm font-mono break-all text-gray-900 dark:text-white">{publicUrl}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" icon={<Copy className="w-3.5 h-3.5" />} onClick={() => void copyUrl()}>
              {copied ? 'Copiato' : 'Copia link'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}
            >
              Apri
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              disabled={saving}
              onClick={() => {
                if (
                  !window.confirm(
                    'Generare un nuovo link? Il precedente non funzionerà più.'
                  )
                ) {
                  return
                }
                void save({ regenerateToken: true })
              }}
            >
              Nuovo link
            </Button>
          </div>
        </div>
      )}

      {!enabled && (
        <p className="text-xs text-gray-500">
          Attiva il tabellone per generare un link univoco da condividere con stampa, web o social.
        </p>
      )}
    </div>
  )
}

function absoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http')) return pathOrUrl
  if (typeof window !== 'undefined') return `${window.location.origin}${pathOrUrl}`
  return pathOrUrl
}
