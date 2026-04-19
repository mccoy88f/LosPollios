'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmElectionDeletionTwice } from '@/lib/confirmDelete'

export default function DeleteElectionButton({
  electionId,
  electionName,
}: {
  electionId: number
  electionName: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    const ok = confirmElectionDeletionTwice({
      title: `Eliminare l’elezione «${electionName}»?`,
      detail:
        'Verranno rimossi in modo permanente: sezioni, affluenze, risultati per sezione, liste, candidati, preferenze. Gli utenti collegati restano ma perdono il collegamento a questa elezione.',
      finalPrompt: `Ultima conferma: procedere con l’eliminazione di «${electionName}»? Non sarà possibile annullare.`,
    })
    if (!ok) return
    setLoading(true)
    const res = await fetch(`/api/elections/${electionId}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) {
      router.push('/admin')
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      window.alert(d.error || 'Impossibile eliminare')
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
    >
      {loading ? 'Eliminazione…' : 'Elimina elezione'}
    </button>
  )
}
