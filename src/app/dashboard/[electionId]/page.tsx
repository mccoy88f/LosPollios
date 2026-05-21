import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ElectionSiteNav } from '@/components/ElectionSiteNav'
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

  const id = Number(electionId)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ElectionSiteNav
        crumbs={[
          { label: 'Home', href: '/' },
          { label: election.name },
          { label: 'Analisi' },
        ]}
        contextLinks={[
          { label: 'Live', href: `/live/${id}` },
          { label: 'Aggiornamenti', href: `/live/${id}/aggiornamenti` },
        ]}
      />
      <AnalysisDashboard
        electionId={id}
        electionName={election.name}
        commune={election.commune}
        historicalElections={historical}
      />
    </div>
  )
}
