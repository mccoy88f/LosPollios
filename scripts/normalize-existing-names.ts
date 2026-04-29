import prisma from '../src/lib/db'
import { normalizeFullNameLabel, normalizeNamePartDisplay } from '../src/lib/personUtils'

async function main() {
  let personsUpdated = 0
  let candidateMayorsUpdated = 0
  let candidatesUpdated = 0
  let historicalMayorsUpdated = 0
  let historicalCouncilCandidatesUpdated = 0

  const persons = await prisma.person.findMany({
    select: { id: true, firstName: true, lastName: true },
  })
  for (const p of persons) {
    const firstName = normalizeNamePartDisplay(p.firstName)
    const lastName = normalizeNamePartDisplay(p.lastName)
    if (firstName !== p.firstName || lastName !== p.lastName) {
      await prisma.person.update({ where: { id: p.id }, data: { firstName, lastName } })
      personsUpdated++
    }
  }

  const lists = await prisma.electionList.findMany({
    select: { id: true, candidateMayor: true },
  })
  for (const l of lists) {
    const candidateMayor = normalizeFullNameLabel(l.candidateMayor)
    if (candidateMayor !== l.candidateMayor) {
      await prisma.electionList.update({ where: { id: l.id }, data: { candidateMayor } })
      candidateMayorsUpdated++
    }
  }

  const candidates = await prisma.candidate.findMany({
    select: { id: true, firstName: true, lastName: true },
  })
  for (const c of candidates) {
    const firstName = normalizeNamePartDisplay(c.firstName)
    const lastName = normalizeNamePartDisplay(c.lastName)
    if (firstName !== c.firstName || lastName !== c.lastName) {
      await prisma.candidate.update({ where: { id: c.id }, data: { firstName, lastName } })
      candidatesUpdated++
    }
  }

  const historicalResults = await prisma.historicalListResult.findMany({
    select: { id: true, candidateMayor: true },
  })
  for (const r of historicalResults) {
    const candidateMayor = normalizeFullNameLabel(r.candidateMayor)
    if (candidateMayor !== r.candidateMayor) {
      await prisma.historicalListResult.update({ where: { id: r.id }, data: { candidateMayor } })
      historicalMayorsUpdated++
    }
  }

  const historicalCandidates = await prisma.historicalCouncilCandidate.findMany({
    select: { id: true, firstName: true, lastName: true },
  })
  for (const c of historicalCandidates) {
    const firstName = normalizeNamePartDisplay(c.firstName)
    const lastName = normalizeNamePartDisplay(c.lastName)
    if (firstName !== c.firstName || lastName !== c.lastName) {
      await prisma.historicalCouncilCandidate.update({
        where: { id: c.id },
        data: { firstName, lastName },
      })
      historicalCouncilCandidatesUpdated++
    }
  }

  console.log(
    JSON.stringify(
      {
        personsUpdated,
        candidateMayorsUpdated,
        candidatesUpdated,
        historicalMayorsUpdated,
        historicalCouncilCandidatesUpdated,
      },
      null,
      2
    )
  )
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

