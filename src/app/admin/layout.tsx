import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SiteTopNav } from '@/components/SiteTopNav'
import { getPrimaryNavLinks } from '@/lib/navLinks'
import { getSessionUserProfile } from '@/lib/sessionUser'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')

  const profile = await getSessionUserProfile(session)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteTopNav
        crumbs={[{ label: 'Amministrazione' }]}
        primaryLinks={getPrimaryNavLinks(session)}
        contextLinks={[{ label: 'Home', href: '/' }]}
        username={session.username}
        displayName={profile?.name}
      />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  )
}
