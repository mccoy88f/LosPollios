import { headers } from 'next/headers'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SiteTopNav } from '@/components/SiteTopNav'
import { getElectionNavFromAdminPath } from '@/lib/adminElectionNav'
import { buildAppMenuSections } from '@/lib/navMenu'
import { getSessionUserProfile } from '@/lib/sessionUser'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')

  const profile = await getSessionUserProfile(session)
  const pathname = (await headers()).get('x-pathname')
  const election = await getElectionNavFromAdminPath(pathname)

  return (
    <div className="page-shell">
      <SiteTopNav
        menuSections={buildAppMenuSections(session, election)}
        election={election}
        username={session.username}
        displayName={profile?.name}
      />
      <main className="admin-zone flex-1 max-w-7xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  )
}
