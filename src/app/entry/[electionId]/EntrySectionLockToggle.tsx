'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EntrySectionLockToggle({
  electionId,
  sectionId,
  locked,
}: {
  electionId: number
  sectionId: number
  locked: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    const next = !locked
    const ok = next
      ? window.confirm('Chiudere questa sezione? I rappresentanti non potranno più modificare i dati.')
      : window.confirm('Riaprire la sezione ai rappresentanti?')
    if (!ok) return
    setBusy(true)
    const res = await fetch(`/api/elections/${electionId}/sections/${sectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locked: next }),
    })
    setBusy(false)
    if (res.ok) router.refresh()
    else {
      const d = await res.json().catch(() => ({}))
      window.alert(d.error || 'Aggiornamento non riuscito')
    }
  }

  return (
    <button
      type="button"
      onClick={() => toggle()}
      disabled={busy}
      className={`text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors disabled:opacity-60 mt-1 ${
        locked
          ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
          : 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
      }`}
    >
      {busy ? '...' : locked ? 'Chiusa · Riapri' : 'Aperta · Chiudi'}
    </button>
  )
}

