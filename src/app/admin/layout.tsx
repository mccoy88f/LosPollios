import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-800 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-bold text-lg flex items-center gap-2">
              <span>🗳️</span> LosPollios
            </Link>
            <Link href="/admin" className="text-blue-200 hover:text-white text-sm transition-colors">Elezioni</Link>
            <Link href="/admin/historical" className="text-blue-200 hover:text-white text-sm transition-colors">Storico</Link>
            <Link href="/" className="text-blue-200 hover:text-white text-sm transition-colors">Home</Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-blue-200 text-sm">{session.username}</span>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                onClick={async (e) => {
                  e.preventDefault()
                  await fetch('/api/auth/logout', { method: 'POST' })
                  window.location.href = '/login'
                }}
                className="text-blue-200 hover:text-white text-sm transition-colors"
              >
                Esci
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
