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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ElectionSiteNav electionId={id} electionName={election.name} />
      <LiveDashboard electionId={id} electionName={election.name} commune={election.commune} />
    </div>
  )
}
