import Link from 'next/link'
import { UserAccessManager } from '@/components/UserAccessManager'

export default function AdminUsersPage() {
  return (
    <div>
      <nav className="text-sm text-gray-500 mb-2">
        <Link href="/admin" className="text-brand-600 hover:underline">
          Elezioni
        </Link>
        <span className="text-gray-300 mx-2">/</span>
        <span className="text-gray-900 font-medium">Accessi</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Gestione accessi</h1>
      <p className="text-gray-500 text-sm mb-6">
        Crea, modifica ed elimina tutti gli account. Limita elezione e sezioni per i rappresentanti di lista.
      </p>
      <UserAccessManager showElectionPicker />
    </div>
  )
}
