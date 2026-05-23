'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type SessionRow = {
  id: string
  userId: number
  username: string
  name: string | null
  role: string
  electionName: string | null
  createdAt: string
  expiresAt: string
  lastSeenAt: string
  userAgent: string | null
  ipAddress: string | null
  isCurrent: boolean
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function roleLabel(role: string) {
  if (role === 'admin') return 'Admin'
  if (role === 'entry') return 'Inserimento'
  if (role === 'viewer') return 'Sola lettura'
  return role
}

function shortUa(ua: string | null) {
  if (!ua) return '—'
  if (ua.length <= 48) return ua
  return ua.slice(0, 45) + '…'
}

export default function ActiveSessionsPanel() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const res = await fetch('/api/admin/sessions')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data.error || 'Caricamento non riuscito')
        return
      }
      setSessions(data.sessions ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const t = setInterval(() => void load(), 30_000)
    return () => clearInterval(t)
  }, [load])

  async function revoke(row: SessionRow) {
    if (
      !window.confirm(
        `Disconnettere «${row.username}»?\n\nL’utente dovrà effettuare di nuovo il login al prossimo utilizzo.`
      )
    ) {
      return
    }
    setRevoking(row.id)
    try {
      const res = await fetch(`/api/admin/sessions/${row.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data.error || 'Operazione non riuscita')
        return
      }
      await load()
      router.refresh()
    } finally {
      setRevoking(null)
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Caricamento sessioni…</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          Sessioni con login valido (ultime 24 h). Aggiornamento automatico ogni 30 secondi.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true)
            void load()
          }}
          className="text-sm border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg"
        >
          Aggiorna
        </button>
      </div>

      {err && <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">{err}</p>}

      {sessions.length === 0 ? (
        <p className="text-gray-500 text-sm">Nessuna sessione attiva al momento.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2">Utente</th>
                <th className="px-3 py-2">Ruolo</th>
                <th className="px-3 py-2">Ultima attività</th>
                <th className="px-3 py-2 hidden md:table-cell">IP</th>
                <th className="px-3 py-2 hidden lg:table-cell">Browser</th>
                <th className="px-3 py-2 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map(row => (
                <tr key={row.id} className={row.isCurrent ? 'bg-brand-50/50' : undefined}>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900">{row.username}</div>
                    {row.name && <div className="text-xs text-gray-500">{row.name}</div>}
                    {row.electionName && (
                      <div className="text-xs text-brand-800">{row.electionName}</div>
                    )}
                    {row.isCurrent && (
                      <span className="text-xs font-medium text-brand-700">(la tua sessione)</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">{roleLabel(row.role)}</td>
                  <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                    {formatWhen(row.lastSeenAt)}
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell text-gray-600 tabular-nums">
                    {row.ipAddress ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell text-gray-500 text-xs max-w-[12rem] truncate" title={row.userAgent ?? undefined}>
                    {shortUa(row.userAgent)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {row.isCurrent ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <button
                        type="button"
                        disabled={revoking === row.id}
                        onClick={() => void revoke(row)}
                        className="text-sm text-red-700 hover:text-red-900 font-medium disabled:opacity-50"
                      >
                        {revoking === row.id ? '…' : 'Disconnetti'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Dopo la disconnessione l’utente può ancora vedere una pagina già aperta finché non naviga o ricarica; le
        API successive richiederanno di nuovo il login.
      </p>
    </div>
  )
}
