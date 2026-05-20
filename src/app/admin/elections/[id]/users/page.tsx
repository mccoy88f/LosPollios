'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { UserAccessManager } from '@/components/UserAccessManager'

export default function ElectionUsersPage() {
  const { id } = useParams<{ id: string }>()
  const electionId = Number(id)

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link href="/admin" className="text-brand-600 hover:underline">
          Elezioni
        </Link>
        <span className="text-gray-300" aria-hidden>
          /
        </span>
        <Link href={`/admin/elections/${id}`} className="text-brand-600 hover:underline">
          Scheda elezione
        </Link>
        <span className="text-gray-300" aria-hidden>
          /
        </span>
        <span className="text-gray-900 font-medium">Accessi</span>
        <span className="text-gray-300 hidden sm:inline">·</span>
        <Link href="/admin/users" className="text-brand-600 hover:underline text-xs">
          Tutti gli account →
        </Link>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Accessi elezione</h1>
      <UserAccessManager electionId={electionId} />
    </div>
  )
}
