'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmRestoreOverwriteTwice } from '@/lib/confirmDelete'
import type { ElectionBackupCounts, ElectionBackupSummary } from '@/lib/electionBackup'

type PreviewOverwrite = {
  summary: ElectionBackupSummary
  current: { electionId: number; electionName: string; counts: ElectionBackupCounts }
}

export default function ElectionBackupPanel({
  electionId,
  electionName,
}: {
  electionId: number
  electionName: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const overwriteFileRef = useRef<HTMLInputElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [restoreNewLoading, setRestoreNewLoading] = useState(false)
  const [overwriteLoading, setOverwriteLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewOverwrite | null>(null)

  async function downloadBackup() {
    setDownloading(true)
    setErr(null)
    setMsg(null)
    try {
      const res = await fetch(`/api/elections/${electionId}/backup`)
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErr(d.error || 'Download non riuscito')
        return
      }
      const blob = await res.blob()
      const disp = res.headers.get('Content-Disposition')
      const match = disp?.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `lospollios-backup-${electionId}.json.gz`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setMsg('Backup scaricato. Conservalo fuori dal server (cloud, PC) per il disaster recovery.')
    } finally {
      setDownloading(false)
    }
  }

  async function restoreAsNew() {
    const input = fileRef.current
    const file = input?.files?.[0]
    if (!file) {
      setErr('Seleziona un file .json.gz di backup')
      return
    }
    if (
      !window.confirm(
        `Creare una nuova elezione dal backup?\n\nIl file non modifica «${electionName}». La copia avrà «(ripristino)» nel nome.`
      )
    ) {
      return
    }

    setRestoreNewLoading(true)
    setErr(null)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await fetch('/api/elections/restore', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data.error || 'Ripristino non riuscito')
        return
      }
      setMsg(`Nuova elezione creata (id ${data.electionId}).`)
      if (input) input.value = ''
      router.push(`/admin/elections/${data.electionId}`)
    } finally {
      setRestoreNewLoading(false)
    }
  }

  async function previewOverwrite() {
    const file = overwriteFileRef.current?.files?.[0]
    if (!file) {
      setErr('Seleziona un file di backup per l’anteprima')
      return
    }
    setOverwriteLoading(true)
    setErr(null)
    setPreview(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('preview', 'true')
      const res = await fetch(`/api/elections/${electionId}/restore`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data.error || 'Anteprima non riuscita')
        return
      }
      setPreview({ summary: data.summary, current: data.current })
    } finally {
      setOverwriteLoading(false)
    }
  }

  async function restoreOverwrite() {
    const file = overwriteFileRef.current?.files?.[0]
    if (!file || !preview) {
      setErr('Esegui prima l’anteprima del backup')
      return
    }

    const ok = confirmRestoreOverwriteTwice({
      electionName,
      backupName: preview.summary.electionName ?? '—',
      backupExportedAt: preview.summary.exportedAt,
      current: preview.current.counts,
      backup: preview.summary.counts,
    })
    if (!ok) return

    const typed = window.prompt(
      `Digita il nome esatto dell’elezione da sovrascrivere:\n\n«${electionName}»`,
      ''
    )
    if (typed == null) return
    if (typed.trim().toLowerCase() !== electionName.trim().toLowerCase()) {
      window.alert('Nome non coincidente: ripristino annullato.')
      return
    }

    setOverwriteLoading(true)
    setErr(null)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('confirmName', typed.trim())
      const res = await fetch(`/api/elections/${electionId}/restore`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(data.error || 'Sovrascrittura non riuscita')
        return
      }
      setMsg('Elezione ripristinata dal backup.')
      setPreview(null)
      if (overwriteFileRef.current) overwriteFileRef.current.value = ''
      router.refresh()
    } finally {
      setOverwriteLoading(false)
    }
  }

  return (
    <div className="space-y-6 text-sm text-gray-700">
      <div>
        <p className="font-semibold text-gray-900 mb-1">Scarica backup</p>
        <p className="mb-2">
          Esporta configurazione e spoglio (sezioni, liste, candidati, affluenze, voti, preferenze) in un file{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">.json.gz</code>. Conservalo fuori dal server.
        </p>
        <button
          type="button"
          onClick={() => void downloadBackup()}
          disabled={downloading}
          className="text-sm border border-brand-700 text-brand-800 hover:bg-brand-50 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
        >
          {downloading ? 'Preparazione…' : 'Scarica backup elezione'}
        </button>
      </div>

      <div className="border-t border-gray-200 pt-5">
        <p className="font-semibold text-gray-900 mb-1">Ripristina come nuova elezione</p>
        <p className="mb-2">Dopo un crash o per clonare i dati senza toccare questa scheda.</p>
        <input ref={fileRef} type="file" accept=".gz,.json,application/gzip,application/json" className="block w-full text-sm mb-2" />
        <button
          type="button"
          onClick={() => void restoreAsNew()}
          disabled={restoreNewLoading}
          className="text-sm border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
        >
          {restoreNewLoading ? 'Ripristino…' : 'Importa come nuova elezione'}
        </button>
      </div>

      <div className="border-t border-amber-200 pt-5">
        <p className="font-semibold text-amber-950 mb-1">Sovrascrivi questa elezione</p>
        <p className="mb-2 text-amber-900">
          Sostituisce sezioni, liste, candidati e tutti i dati di inserimento con quelli del backup. Richiede
          conferma esplicita. Gli utenti di accesso non vengono modificati.
        </p>
        <input
          ref={overwriteFileRef}
          type="file"
          accept=".gz,.json,application/gzip,application/json"
          className="block w-full text-sm mb-2"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void previewOverwrite()}
            disabled={overwriteLoading}
            className="text-sm border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
          >
            Anteprima backup
          </button>
          <button
            type="button"
            onClick={() => void restoreOverwrite()}
            disabled={overwriteLoading || !preview}
            className="text-sm text-red-700 border border-red-300 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
          >
            {overwriteLoading ? 'Sovrascrittura…' : 'Sovrascrivi da backup'}
          </button>
        </div>

        {preview && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs space-y-2">
            <p>
              <strong>Backup:</strong> {preview.summary.electionName} · {preview.summary.commune}
              {preview.summary.exportedAt && (
                <> · {new Date(preview.summary.exportedAt).toLocaleString('it-IT')}</>
              )}
            </p>
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500">
                  <th className="pr-2" />
                  <th className="pr-2">Ora (DB)</th>
                  <th>Backup</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Sezioni', 'sections'],
                    ['Affluenze', 'turnouts'],
                    ['Risultati lista', 'listResults'],
                    ['Preferenze', 'preferences'],
                  ] as const
                ).map(([label, key]) => (
                  <tr key={key}>
                    <td className="py-0.5 pr-2">{label}</td>
                    <td className="tabular-nums">{preview.current.counts[key]}</td>
                    <td className="tabular-nums">{preview.summary.counts[key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {msg && <p className="text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{msg}</p>}
      {err && <p className="text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
    </div>
  )
}
