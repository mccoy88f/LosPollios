import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'

type Props = { params: Promise<{ electionId: string }> }

/** Unificato nella live come tab ?view=preferenze */
export default async function PreferenzeLiveRoute({ params }: Props) {
  const { electionId } = await params
  const election = await prisma.election.findUnique({ where: { id: Number(electionId) } })
  if (!election) notFound()
  redirect(`/live/${election.id}?view=preferenze`)
}
