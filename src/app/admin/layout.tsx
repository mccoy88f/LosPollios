import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SiteTopNav } from '@/components/SiteTopNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteTopNav
        primaryLinks={[
          { label: 'Elezioni', href: '/admin' },
          { label: 'Anagrafica', href: '/admin/persons' },
          { label: 'Dati storici', href: '/admin/historical' },
        ]}
        contextLinks={[{ label: 'Home pubblica', href: '/' }]}
        username={session.username}
        showLogout
      />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
