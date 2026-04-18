'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_LABEL: Record<string, string> = { setup: 'Configurazione', active: 'Attiva', closed: 'Chiusa' }
const STATUS_COLOR: Record<string, string> = {
  setup:  'bg-yellow-100 text-yellow-800 border-yellow-200',
  active: 'bg-green-100  text-green-800  border-green-200',
  closed: 'bg-gray-100   text-gray-700   border-gray-200',
}

export default function ElectionStatusForm({ electionId, currentStatus }: { electionId: number; currentStatus: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function changeStatus(status: string) {
    setLoading(true)
    await fetch(`/api/elections/${electionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLOR[currentStatus]}`}>
        {STATUS_LABEL[currentStatus]}
      </span>
      {currentStatus === 'setup'   && <button onClick={() => changeStatus('active')} disabled={loading} className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium">Attiva</button>}
      {currentStatus === 'active'  && <button onClick={() => changeStatus('closed')} disabled={loading} className="text-sm bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg font-medium">Chiudi</button>}
      {currentStatus === 'closed'  && <button onClick={() => changeStatus('active')} disabled={loading} className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg font-medium">Riapri</button>}
    </div>
  )
}
