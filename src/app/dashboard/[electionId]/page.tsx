import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import AnalysisDashboard from './AnalysisDashboard'

type Props = { params: Promise<{ electionId: string }> }

export default async function DashboardPage({ params }: Props) {
  const { electionId } = await params
  const election = await prisma.election.findUnique({ where: { id: Number(electionId) } })
  if (!election) notFound()

  const historical = await prisma.historicalElection.findMany({
    where: { commune: { contains: election.commune.replace(/Comune di /i, '') } },
    include: { results: { orderBy: { votes: 'desc' } } },
    orderBy: { year: 'desc' },
    take: 5,
  })

  return (
    <AnalysisDashboard
      electionId={Number(electionId)}
      electionName={election.name}
      commune={election.commune}
      historicalElections={historical}
    />
  )
}
