import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import LiveAggiornamentiPage from './LiveAggiornamentiPage'

type Props = { params: Promise<{ electionId: string }> }

export default async function LiveAggiornamentiRoute({ params }: Props) {
  const { electionId } = await params
  const election = await prisma.election.findUnique({ where: { id: Number(electionId) } })
  if (!election) notFound()

  return (
    <LiveAggiornamentiPage
      electionId={election.id}
      electionName={election.name}
      commune={election.commune}
    />
  )
}
