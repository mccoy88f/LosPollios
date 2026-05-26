'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'

function filenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      /* ignore */
    }
  }
  const q = /filename="([^"]+)"/i.exec(cd)
  if (q?.[1]) return q[1].trim()
  return null
}

export function ElectionExportPanel({ electionId }: { electionId: number }) {
  const [busy, setBusy] = useState(false)

  const downloadXlsx = useCallback(async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/elections/${electionId}/reports/xlsx`)
      if (!res.ok) {
        const msg = res.status === 401 ? 'Accesso negato.' : `Errore ${res.status}`
        window.alert(msg)
        return
      }
      const blob = await res.blob()
      const name =
        filenameFromContentDisposition(res.headers.get('Content-Disposition')) ??
        `lospollios-report-${electionId}.xlsx`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }, [electionId])

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/70 dark:bg-violet-950/25 dark:border-violet-900/50 overflow-hidden">
      <h2 className="px-4 py-3 font-semibold text-violet-950 dark:text-violet-100 border-b border-violet-200/80 dark:border-violet-900/50">
        Export
      </h2>
      <div className="px-4 pb-4 pt-3 space-y-3 text-sm text-gray-800 dark:text-neutral-200">
        <p className="text-gray-600 dark:text-neutral-400">
          File Excel multipagina: <strong className="font-medium text-gray-800 dark:text-neutral-200">Info</strong>,{' '}
          <strong className="font-medium text-gray-800 dark:text-neutral-200">Liste</strong>,{' '}
          <strong className="font-medium text-gray-800 dark:text-neutral-200">Sezioni</strong>,{' '}
          preferenze per sezione e totali candidato. Ogni{' '}
          <strong className="font-medium text-gray-800 dark:text-neutral-200">percentuale</strong> è corredata dai valori
          assoluti usati nel rapporto (ad es. voti lista e denominatore sulla stessa riga, indicato anche nelle intestazioni).
        </p>
        <Button
          type="button"
          variant="secondary"
          icon={<Download className="w-4 h-4" />}
          disabled={busy}
          onClick={() => void downloadXlsx()}
        >
          {busy ? 'Preparazione…' : 'Scarica report (.xlsx)'}
        </Button>
      </div>
    </section>
  )
}
