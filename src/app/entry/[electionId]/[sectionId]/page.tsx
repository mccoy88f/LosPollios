import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { assertEntryCanWriteSection } from '@/lib/userAccess'
import { redirect, notFound } from 'next/navigation'
import SectionEntryForm from './SectionEntryForm'
import { EntryContextNav } from '@/components/EntryContextNav'
import { Alert } from '@/components/ui/Alert'

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

  // Existing data
  const existingTurnout = section.turnout ? {
    votersActual: section.turnout.votersActual,
    ballotsValid: section.turnout.ballotsValid ?? undefined,
    ballotsNull:  section.turnout.ballotsNull  ?? undefined,
    ballotsBlank: section.turnout.ballotsBlank ?? undefined,
  } : null

  const existingListResults = section.listResults.map(r => ({
    listId:     r.listId,
    listVotes:  r.listVotes,
    preferences: r.preferences.map(p => ({ candidateId: p.candidateId, votes: p.votes })),
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <EntryContextNav
        username={session.username}
        electionId={election.id}
        electionName={election.name}
        section={{ number: section.number, name: section.name }}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-brand-200 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-semibold text-blue-900">Sezione {section.number} {section.name ? `– ${section.name}` : ''}</h2>
              {section.location && <p className="text-blue-700 text-sm">{section.location}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-brand-600">Aventi diritto al voto</p>
              <p className="text-2xl font-bold text-blue-900">{section.theoreticalVoters.toLocaleString('it-IT')}</p>
            </div>
          </div>
        </div>

        {readOnly && (
          <Alert variant="warning" title="Sezione chiusa" className="mb-6">
            L&apos;amministratore ha terminato lo scrutinio su questa sezione: i dati sono in sola lettura.
          </Alert>
        )}

        <SectionEntryForm
          electionId={Number(electionId)}
          sectionId={Number(sectionId)}
          readOnly={readOnly}
          lists={listsForForm.map(l => ({
            id: l.id,
            name: l.name,
            color: l.color,
            candidateMayor: l.candidateMayor,
            candidates: l.candidates.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName, order: c.order })),
          }))}
          existingTurnout={existingTurnout}
          existingListResults={existingListResults}
          theoreticalVoters={section.theoreticalVoters}
        />
      </div>
    </div>
  )
}
