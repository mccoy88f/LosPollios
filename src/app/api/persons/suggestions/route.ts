import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { namesMatch, parseFullNameLabel } from '@/lib/personUtils'

/**
 * Suggerisce Persone già in anagrafica e occorrenze con stesso nome/cognome
 * (candidati in altre liste/elezioni, sindaci storici).
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { searchParams } = req.nextUrl
  let firstName = searchParams.get('firstName')?.trim() ?? ''
  let lastName = searchParams.get('lastName')?.trim() ?? ''
  const mayorLabel = searchParams.get('mayorLabel')?.trim()

  if ((!firstName || !lastName) && mayorLabel) {
    const parsed = parseFullNameLabel(mayorLabel)
    if (parsed?.lastName) {
      firstName = parsed.firstName
      lastName = parsed.lastName
    }
  }

  if (!firstName || !lastName) {
    return NextResponse.json({
      persons: [],
      candidateHits: [],
      historicalMayorHits: [],
    })
  }

  const [allPersons, allCandidates, allHistoricalRows] = await Promise.all([
    prisma.person.findMany({
      include: { _count: { select: { candidates: true, mayorForLists: true, historicalMayors: true } } },
    }),
    prisma.candidate.findMany({
      include: {
        list: { include: { election: true } },
        person: true,
      },
    }),
    prisma.historicalListResult.findMany({
      include: { election: true },
    }),
  ])

  const persons = allPersons.filter(p => namesMatch(p.firstName, firstName) && namesMatch(p.lastName, lastName))

  const candidateHits = allCandidates
    .filter(c => namesMatch(c.firstName, firstName) && namesMatch(c.lastName, lastName))
    .map(c => ({
      candidateId: c.id,
      listId: c.listId,
      listName: c.list.name,
      electionId: c.list.election.id,
      electionName: c.list.election.name,
      electionDate: c.list.election.date,
      linkedPersonId: c.personId,
    }))

  const historicalMayorHits = allHistoricalRows
    .filter(row => {
      const p = parseFullNameLabel(row.candidateMayor)
      return p && namesMatch(p.firstName, firstName) && namesMatch(p.lastName, lastName)
    })
    .map(row => ({
      resultId: row.id,
      listName: row.listName,
      year: row.election.year,
      historicalElectionName: row.election.name,
      commune: row.election.commune,
      candidateMayor: row.candidateMayor,
      linkedPersonId: row.mayorPersonId,
    }))

  return NextResponse.json({ persons, candidateHits, historicalMayorHits })
}
