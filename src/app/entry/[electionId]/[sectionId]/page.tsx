import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { assertEntryCanWriteSection } from '@/lib/userAccess'
import { redirect, notFound } from 'next/navigation'
import { EntryContextNav } from '@/components/EntryContextNav'
import { EntrySectionWorkspace } from './EntrySectionWorkspace'

type Props = { params: Promise<{ electionId: string; sectionId: string }> }

export default async function SectionEntryPage({ params }: Props) {
  const { electionId, sectionId } = await params
  const session = await getSession()
  if (!session || session.role === 'viewer') redirect('/login')

  const election = await prisma.election.findUnique({
    where: { id: Number(electionId) },
    include: { lists: { orderBy: { order: 'asc' }, include: { candidates: { orderBy: { order: 'asc' } } } } },
  })
  if (!election) notFound()

  if (session.role === 'entry' && election.archived) {
    redirect('/')
  }

  const access = await assertEntryCanWriteSection(session, election.id, Number(sectionId))
  if (!access.ok && session.role === 'entry') {
    redirect(`/entry/${electionId}`)
  }

  const section = await prisma.section.findUnique({
    where: { id: Number(sectionId) },
    include: {
      turnout: true,
      listResults: {
        include: { preferences: true },
      },
    },
  })
  if (!section) notFound()

  const readOnly = session.role === 'entry' && section.locked

  const listsForForm =
    session.role === 'entry' && session.listId
      ? election.lists.filter(l => l.id === session.listId)
      : election.lists

  const existingTurnout = section.turnout
    ? {
        votersActual: section.turnout.votersActual,
        ballotsValid: section.turnout.ballotsValid ?? undefined,
        ballotsNull: section.turnout.ballotsNull ?? undefined,
        ballotsBlank: section.turnout.ballotsBlank ?? undefined,
      }
    : null

  const existingListResults = section.listResults.map(r => ({
    listId: r.listId,
    listVotes: r.listVotes,
    preferences: r.preferences.map(p => ({ candidateId: p.candidateId, votes: p.votes })),
  }))

  return (
    <div className="h-dvh bg-gray-50 flex flex-col overflow-hidden">
      <EntryContextNav
        electionId={election.id}
        electionName={election.name}
        section={{ id: section.id, number: section.number, name: section.name }}
      />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden max-w-4xl mx-auto w-full px-4 py-2 md:py-3">
        <EntrySectionWorkspace
          electionId={Number(electionId)}
          sectionId={Number(sectionId)}
          sectionNumber={section.number}
          sectionName={section.name}
          sectionLocation={section.location}
          theoreticalVoters={section.theoreticalVoters}
          readOnly={readOnly}
          lists={listsForForm.map(l => ({
            id: l.id,
            name: l.name,
            color: l.color,
            candidateMayor: l.candidateMayor,
            candidates: l.candidates.map(c => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
              order: c.order,
            })),
          }))}
          existingTurnout={existingTurnout}
          existingListResults={existingListResults}
        />
      </div>
    </div>
  )
}
