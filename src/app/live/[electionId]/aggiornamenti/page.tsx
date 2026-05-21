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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ElectionSiteNav
        crumbs={[
          { label: 'Home', href: '/' },
          { label: election.name, href: `/live/${id}` },
          { label: 'Aggiornamenti' },
        ]}
        contextLinks={[
          { label: 'Live', href: `/live/${id}` },
          { label: 'Preferenze', href: `/live/${id}/preferenze` },
          { label: 'Analisi', href: `/dashboard/${id}` },
        ]}
        maxWidthClass="max-w-5xl"
      />
      <LiveAggiornamentiPage electionId={id} electionName={election.name} commune={election.commune} />
    </div>
  )
}
