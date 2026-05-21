import { getSession } from '@/lib/auth'
import { buildAppMenuSections, type ElectionNavContext } from '@/lib/navMenu'
import { getSessionUserProfile } from '@/lib/sessionUser'
import { SiteTopNav } from '@/components/SiteTopNav'

export async function ElectionSiteNav({
  electionId,
  electionName,
  maxWidthClass = 'max-w-7xl',
  subHeader,
  contextBarChildren,
}: {
  electionId: number
  electionName: string
  maxWidthClass?: string
  subHeader?: React.ReactNode
  contextBarChildren?: React.ReactNode
}) {
  const session = await getSession()
  const profile = session ? await getSessionUserProfile(session) : null
  if (!session) return null

  const election: ElectionNavContext = { electionId, electionName }

  return (
    <SiteTopNav
      menuSections={buildAppMenuSections(session, election)}
      election={election}
      username={session.username}
      displayName={profile?.name}
      maxWidthClass={maxWidthClass}
      subHeader={subHeader}
      contextBarChildren={contextBarChildren}
    />
  )
}
