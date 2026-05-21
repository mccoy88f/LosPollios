import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getAllowedSectionIdsForUser } from '@/lib/userAccess'
import { buildAppMenuSections } from '@/lib/navMenu'
import { getSessionUserProfile } from '@/lib/sessionUser'
import { resolveSectionUiStatus, sectionHasEntryData } from '@/lib/sectionStatus'
import { SiteTopNav } from '@/components/SiteTopNav'
import { EntrySectionTabs, type EntrySectionTab } from '@/components/nav/EntrySectionTabs'

type Props = {
  electionId: number
  electionName: string
  section?: { id: number; number: number; name: string | null }
}

export async function EntryContextNav({ electionId, electionName, section }: Props) {
  const session = await getSession()
  const profile = session ? await getSessionUserProfile(session) : null
  if (!session) return null

  let sectionTabs: React.ReactNode = null
  if (section) {
    let allowedSectionIds: number[] | null = null
    if (session.role === 'entry') {
      allowedSectionIds =
        session.allowedSectionIds ?? (await getAllowedSectionIdsForUser(session.userId))
    }

    const sections = await prisma.section.findMany({
      where: {
        electionId,
        ...(allowedSectionIds?.length ? { id: { in: allowedSectionIds } } : {}),
      },
      orderBy: { number: 'asc' },
      include: { turnout: true, listResults: true },
    })

    const tabs: EntrySectionTab[] = sections.map(s => ({
      id: s.id,
      number: s.number,
      status: resolveSectionUiStatus(
        s.locked,
        sectionHasEntryData(
          s.turnout?.votersActual,
          s.listResults.some(r => r.listVotes > 0)
        )
      ),
    }))

    sectionTabs = (
      <EntrySectionTabs
        electionId={electionId}
        sections={tabs}
        currentSectionId={section.id}
      />
    )
  }

  return (
    <SiteTopNav
      menuSections={buildAppMenuSections(session, { electionId, electionName })}
      election={{ electionId, electionName }}
      username={session.username}
      displayName={profile?.name}
      maxWidthClass="max-w-4xl"
      subHeader={sectionTabs}
    />
  )
}
