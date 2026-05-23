import { prisma } from '@/lib/db'
import { electionHasCoalitions } from '@/lib/liveElection'
import type { ElectionNavContext } from '@/lib/navMenu'

export async function getElectionNavContext(electionId: number): Promise<ElectionNavContext | null> {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: {
      id: true,
      name: true,
      lists: { select: { coalition: true } },
    },
  })
  if (!election) return null
  return {
    electionId: election.id,
    electionName: election.name,
    hasCoalitions: electionHasCoalitions(election.lists),
  }
}

/** Contesto elezione da URL admin `/admin/elections/[id]/...` (per menu laterale). */
export async function getElectionNavFromAdminPath(
  pathname: string | null
): Promise<ElectionNavContext | null> {
  if (!pathname) return null
  const m = pathname.match(/^\/admin\/elections\/(\d+)(?:\/|$)/)
  if (!m) return null
  const electionId = Number(m[1])
  if (!Number.isFinite(electionId)) return null
  return getElectionNavContext(electionId)
}
