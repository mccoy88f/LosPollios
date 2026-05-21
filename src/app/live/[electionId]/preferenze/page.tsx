import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ElectionSiteNav } from '@/components/ElectionSiteNav'
import LivePreferenzePage from './LivePreferenzePage'

type Props = { params: Promise<{ electionId: string }> }

export default async function PreferenzeLiveRoute({ params }: Props) {
  const { electionId } = await params
  const election = await prisma.election.findUnique({ where: { id: Number(electionId) } })
  if (!election) notFound()
  const id = election.id

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ElectionSiteNav electionId={id} electionName={election.name} />
      <LivePreferenzePage electionId={id} electionName={election.name} commune={election.commune} />
    </div>
  )
}
