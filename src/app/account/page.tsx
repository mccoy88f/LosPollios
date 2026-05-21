import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getSessionUserProfile } from '@/lib/sessionUser'
import { getAllowedSectionIdsForUser } from '@/lib/userAccess'
import { buildAppMenuSections } from '@/lib/navMenu'
import { SiteTopNav } from '@/components/SiteTopNav'
import { PageHeader } from '@/components/ui/Card'
import { LogoutButton } from '@/components/nav/LogoutButton'
import { AccountSettingsForm } from './AccountSettingsForm'

export default async function AccountPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await getSessionUserProfile(session)
  if (!user) redirect('/login')

  const allowedSectionIds = await getAllowedSectionIdsForUser(user.id)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteTopNav
        menuSections={buildAppMenuSections(session)}
        username={session.username}
        displayName={user.name}
      />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
        <PageHeader title="Il mio account" description="Aggiorna nome e password." />
        <AccountSettingsForm
          initial={{
            username: user.username,
            name: user.name,
            role: user.role,
            election: user.election,
            list: user.list,
            allowedSectionIds,
          }}
        />

        <div className="mt-8 pt-6 border-t border-gray-200">
          <LogoutButton />
        </div>

        <footer className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p className="font-medium text-gray-700">LosPollios</p>
          <p className="mt-1">Sviluppato da Antonello Migliorelli</p>
          <p className="text-xs text-gray-400 mt-2">Gestione spoglio elezioni amministrative</p>
        </footer>
      </main>
    </div>
  )
}
