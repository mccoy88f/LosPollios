import { getSession } from '@/lib/auth'
import { buildAppMenuSections } from '@/lib/navMenu'
import { getSessionUserProfile } from '@/lib/sessionUser'
import { SiteTopNav } from '@/components/SiteTopNav'

type Props = {
  electionId: number
  electionName: string
}

export async function EntryContextNav({ electionId, electionName }: Props) {
  const session = await getSession()
  const profile = session ? await getSessionUserProfile(session) : null
  if (!session) return null

  return (
    <SiteTopNav
      menuSections={buildAppMenuSections(session, { electionId, electionName })}
      election={{ electionId, electionName }}
      username={session.username}
      displayName={profile?.name}
      maxWidthClass="max-w-4xl"
    />
  )
}
