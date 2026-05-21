import { getSession } from '@/lib/auth'
import { getPrimaryNavLinks } from '@/lib/navLinks'
import { getSessionUserProfile } from '@/lib/sessionUser'
import { SiteTopNav, type NavCrumb } from '@/components/SiteTopNav'

type NavLink = { label: string; href: string }

export async function ElectionSiteNav({
  crumbs,
  contextLinks,
  maxWidthClass = 'max-w-7xl',
}: {
  crumbs: NavCrumb[]
  contextLinks?: NavLink[]
  maxWidthClass?: string
}) {
  const session = await getSession()
  const profile = session ? await getSessionUserProfile(session) : null

  return (
    <SiteTopNav
      crumbs={crumbs}
      contextLinks={contextLinks}
      primaryLinks={getPrimaryNavLinks(session ?? undefined)}
      username={session?.username}
      displayName={profile?.name}
      maxWidthClass={maxWidthClass}
    />
  )
}
