import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ElectionSiteNav } from '@/components/ElectionSiteNav'
import LiveAggiornamentiPage from './LiveAggiornamentiPage'

type Props = { params: Promise<{ electionId: string }> }

export default async function LiveAggiornamentiRoute({ params }: Props) {
  const { electionId } = await params
  const election = await prisma.election.findUnique({ where: { id: Number(electionId) } })
  if (!election) notFound()
  const id = election.id

  return (
    <div className="page-shell">
      <ElectionSiteNav electionId={id} electionName={election.name} maxWidthClass="max-w-5xl" />
      <LiveAggiornamentiPage electionId={id} electionName={election.name} commune={election.commune} />
    </div>
  )
}
