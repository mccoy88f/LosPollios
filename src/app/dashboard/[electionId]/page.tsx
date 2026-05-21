import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'

type Props = { params: Promise<{ electionId: string }> }

/** Analisi integrata nella live come tab ?view=analisi */
export default async function DashboardPage({ params }: Props) {
  const { electionId } = await params
  const election = await prisma.election.findUnique({ where: { id: Number(electionId) } })
  if (!election) notFound()
  redirect(`/live/${election.id}?view=analisi`)
}
