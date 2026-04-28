import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import LivePreferenzePage from './LivePreferenzePage'

type Props = { params: Promise<{ electionId: string }> }

export default async function PreferenzeLiveRoute({ params }: Props) {
  const { electionId } = await params
  const election = await prisma.election.findUnique({ where: { id: Number(electionId) } })
  if (!election) notFound()

  return (
    <LivePreferenzePage
      electionId={election.id}
      electionName={election.name}
      commune={election.commune}
    />
  )
}
