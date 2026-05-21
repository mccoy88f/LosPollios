import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ElectionSiteNav } from '@/components/ElectionSiteNav'
import LiveDashboard from './LiveDashboard'

type Props = { params: Promise<{ electionId: string }> }

export default async function LivePage({ params }: Props) {
  const { electionId } = await params
  const election = await prisma.election.findUnique({ where: { id: Number(electionId) } })
  if (!election) notFound()
  const id = Number(electionId)

  const historical = await prisma.historicalElection.findMany({
    where: { commune: { contains: election.commune.replace(/Comune di /i, '') } },
    include: { results: { orderBy: { votes: 'desc' } } },
    orderBy: { year: 'desc' },
    take: 5,
  })

  const historicalElections = historical.map(h => ({
    id: h.id,
    name: h.name,
    commune: h.commune,
    year: h.year,
    results: h.results.map(r => ({
      id: r.id,
      listName: r.listName,
      coalition: r.coalition,
      candidateMayor: r.candidateMayor,
      votes: r.votes,
      percentage: r.percentage,
      seats: r.seats,
    })),
  }))

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ElectionSiteNav electionId={id} electionName={election.name} />
      <LiveDashboard
        electionId={id}
        electionName={election.name}
        commune={election.commune}
        historicalElections={historicalElections}
      />
    </div>
  )
}
