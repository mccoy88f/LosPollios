import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import SectionEntryForm from './SectionEntryForm'

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
      <nav className="bg-blue-800 text-white shadow">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <a href={`/entry/${electionId}`} className="text-blue-200 hover:text-white text-sm">← Sezioni</a>
            <span className="text-white font-semibold">Sezione {section.number}</span>
            {section.name && <span className="text-blue-200 text-sm">· {section.name}</span>}
          </div>
          <div className="text-blue-200 text-sm">{session.username}</div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-semibold text-blue-900">Sezione {section.number} {section.name ? `– ${section.name}` : ''}</h2>
              {section.location && <p className="text-blue-700 text-sm">{section.location}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600">Votanti teorici</p>
              <p className="text-2xl font-bold text-blue-900">{section.theoreticalVoters.toLocaleString('it-IT')}</p>
            </div>
          </div>
        </div>

        <SectionEntryForm
          electionId={Number(electionId)}
          sectionId={Number(sectionId)}
          lists={election.lists.map(l => ({
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
