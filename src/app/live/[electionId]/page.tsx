import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import LiveDashboard from './LiveDashboard'

type Props = { params: Promise<{ electionId: string }> }

export default async function LivePage({ params }: Props) {
  const { electionId } = await params
  const election = await prisma.election.findUnique({ where: { id: Number(electionId) } })
  if (!election) notFound()

  return (
    <LiveDashboard
      electionId={Number(electionId)}
      electionName={election.name}
      commune={election.commune}
    />
  )
}
