'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ElectionArchiveControl({
  electionId,
  status,
  archived,
}: {
  electionId: number
  status: string
  archived: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function setArchived(next: boolean) {
    if (next && !confirm('Archiviare questa elezione? Sparirà dall’elenco principale e i rappresentanti non potranno più inserire dati.')) return
    if (!next && !confirm('Ripristinare l’elezione dall’archivio?')) return
    setLoading(true)
    await fetch(`/api/elections/${electionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: next }),
    })
    router.refresh()
    setLoading(false)
  }

  if (archived) {
    return (
      <button
        type="button"
        onClick={() => setArchived(false)}
        disabled={loading}
        className="text-sm bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-60"
      >
        Ripristina da archivio
      </button>
    )
  }
  if (status === 'closed') {
    return (
      <button
        type="button"
        onClick={() => setArchived(true)}
        disabled={loading}
        className="text-sm bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-60"
      >
        Archivia
      </button>
    )
  }
  return null
}
