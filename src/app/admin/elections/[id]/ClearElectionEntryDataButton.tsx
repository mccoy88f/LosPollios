'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmClearEntryDataTwice } from '@/lib/confirmDelete'
import type { ElectionEntryDataCounts } from '@/lib/clearElectionEntryData'

export default function ClearElectionEntryDataButton({
  electionId,
  electionName,
  counts,
}: {
  electionId: number
  electionName: string
  counts: ElectionEntryDataCounts
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const total = counts.turnouts + counts.listResults + counts.preferences
  const empty = total === 0

  async function handleClear() {
    const ok = confirmClearEntryDataTwice({
      electionName,
      turnouts: counts.turnouts,
      listResults: counts.listResults,
      preferences: counts.preferences,
    })
    if (!ok) return

    setLoading(true)
    try {
      const res = await fetch(`/api/elections/${electionId}/clear-entry-data`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        window.alert(data.error || 'Operazione non riuscita')
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-700">
        {empty ? (
          'Nessun dato di inserimento sezione presente.'
        ) : (
          <>
            Presenti: <strong>{counts.turnouts}</strong> affluenze sezione,{' '}
            <strong>{counts.listResults}</strong> risultati lista,{' '}
            <strong>{counts.preferences}</strong> preferenze.
          </>
        )}
      </p>
      <button
        type="button"
        onClick={handleClear}
        disabled={loading || empty}
        className="text-sm text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Svuotamento…' : 'Azzera dati inserimento sezioni'}
      </button>
    </div>
  )
}
