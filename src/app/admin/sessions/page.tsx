import Link from 'next/link'
import ActiveSessionsPanel from './ActiveSessionsPanel'

export default function AdminSessionsPage() {
  return (
    <div>
      <nav className="text-sm text-gray-500 mb-2">
        <Link href="/admin" className="text-brand-600 hover:underline">
          Elezioni
        </Link>
        <span className="text-gray-300 mx-2">/</span>
        <span className="text-gray-900 font-medium">Sessioni attive</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sessioni attive</h1>
      <p className="text-gray-500 text-sm mb-6">
        Utenti attualmente loggati. Puoi disconnetterli da remoto; dovranno rifare il login.
      </p>
      <ActiveSessionsPanel />
    </div>
  )
}
