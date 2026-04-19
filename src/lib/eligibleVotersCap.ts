import type { Prisma } from '@prisma/client'
import prisma from '@/lib/db'

type Db = Prisma.TransactionClient | typeof prisma

/**
 * Verifica che, se è impostato `eligibleVotersTotal`, la somma di `theoreticalVoters` sulle sezioni non lo superi.
 */
export async function assertEligibleSectionsWithinCap(electionId: number, db: Db = prisma): Promise<void> {
  const election = await db.election.findUnique({
    where: { id: electionId },
    select: { eligibleVotersTotal: true },
  })
  const cap = election?.eligibleVotersTotal
  if (cap == null) return

  const agg = await db.section.aggregate({
    where: { electionId },
    _sum: { theoreticalVoters: true },
  })
  const sum = agg._sum.theoreticalVoters ?? 0
  if (sum > cap) {
    throw new Error(
      `La somma degli aventi diritto nelle sezioni (${sum.toLocaleString('it-IT')}) supera il totale comunale impostato (${cap.toLocaleString('it-IT')}). Riduci i valori per sezione o aumenta il totale in «Modifica dati elezione».`
    )
  }
}

export async function getEligibleVotersBudget(electionId: number) {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: { eligibleVotersTotal: true },
  })
  const cap = election?.eligibleVotersTotal ?? null
  const agg = await prisma.section.aggregate({
    where: { electionId },
    _sum: { theoreticalVoters: true },
  })
  const sum = agg._sum.theoreticalVoters ?? 0
  return {
    cap,
    sum,
    remaining: cap != null ? cap - sum : null,
    over: cap != null && sum > cap,
  }
}
