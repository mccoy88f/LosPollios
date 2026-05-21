import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type Params = { params: Promise<{ id: string; candidateId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id, candidateId } = await params
  const electionId = Number(id)
  const candId = Number(candidateId)

  const candidate = await prisma.candidate.findFirst({
    where: { id: candId, list: { electionId } },
    include: { list: true },
  })
  if (!candidate) return NextResponse.json({ error: 'Candidato non trovato' }, { status: 404 })

  const preferences = await prisma.candidatePreference.findMany({
    where: {
      candidateId: candId,
      votes: { gt: 0 },
      sectionResult: { section: { electionId } },
    },
    include: {
      sectionResult: {
        include: { section: true, list: true },
      },
    },
  })

  const sectionMap = new Map<
    number,
    { sectionId: number; number: number; name: string | null; votes: number; listVotes: number }
  >()

  for (const p of preferences) {
    const sec = p.sectionResult.section
    const existing = sectionMap.get(sec.id)
    if (existing) {
      existing.votes += p.votes
    } else {
      sectionMap.set(sec.id, {
        sectionId: sec.id,
        number: sec.number,
        name: sec.name,
        votes: p.votes,
        listVotes: p.sectionResult.listVotes,
      })
    }
  }

  const sections = Array.from(sectionMap.values()).sort((a, b) => a.number - b.number)
  const totalVotes = sections.reduce((s, x) => s + x.votes, 0)

  return NextResponse.json({
    candidate: {
      candidateId: candidate.id,
      name: `${candidate.firstName} ${candidate.lastName}`,
      listId: candidate.listId,
      listName: candidate.list.name,
      color: candidate.list.color,
    },
    totalVotes,
    sections,
  })
}
