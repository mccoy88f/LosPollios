import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type Params = { params: Promise<{ id: string; sectionId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id, sectionId } = await params
  const electionId = Number(id)
  const secId = Number(sectionId)

  const section = await prisma.section.findFirst({
    where: { id: secId, electionId },
  })
  if (!section) return NextResponse.json({ error: 'Sezione non trovata' }, { status: 404 })

  const [turnout, listResults, lists] = await Promise.all([
    prisma.sectionTurnout.findUnique({ where: { sectionId: secId } }),
    prisma.sectionListResult.findMany({
      where: { sectionId: secId },
      include: {
        list: true,
        preferences: { include: { candidate: true } },
      },
    }),
    prisma.electionList.findMany({
      where: { electionId },
      orderBy: { order: 'asc' },
      include: { candidates: { orderBy: { order: 'asc' } } },
    }),
  ])

  const resultByListId = new Map(listResults.map(r => [r.listId, r]))
  const listVotesSum = listResults.reduce((s, r) => s + r.listVotes, 0)
  const votersActual = turnout?.votersActual ?? null
  const ballotsValid = turnout?.ballotsValid ?? null

  const sectionWarnings: string[] = []
  if (listVotesSum > 0 && turnout) {
    if (ballotsValid != null && listVotesSum !== ballotsValid) {
      sectionWarnings.push(
        `Somma voti lista (${listVotesSum}) diversa da schede valide (${ballotsValid}).`
      )
    } else if (ballotsValid == null && votersActual != null && votersActual > 0 && listVotesSum !== votersActual) {
      sectionWarnings.push(
        `Somma voti lista (${listVotesSum}) diversa da votanti reali (${votersActual}).`
      )
    }
  }

  const listsDetail = lists.map(l => {
    const r = resultByListId.get(l.id)
    const listVotes = r?.listVotes ?? 0
    const prefByCandidate = new Map(
      (r?.preferences ?? []).map(p => [p.candidateId, p.votes])
    )
    const candidates = l.candidates
      .map(c => ({
        candidateId: c.id,
        name: `${c.firstName} ${c.lastName}`,
        votes: prefByCandidate.get(c.id) ?? 0,
        order: c.order,
      }))
      .filter(c => c.votes > 0 || listVotes > 0)
      .sort((a, b) => b.votes - a.votes || a.order - b.order)

    const prefSum = candidates.reduce((s, c) => s + c.votes, 0)
    if (listVotes > 0 && prefSum > listVotes) {
      sectionWarnings.push(
        `${l.name}: preferenze (${prefSum}) superiori ai voti lista (${listVotes}).`
      )
    }

    return {
      listId: l.id,
      listName: l.name,
      shortName: l.shortName,
      color: l.color,
      listLogoUrl: l.listLogoUrl,
      coalition: l.coalition,
      candidateMayor: l.candidateMayor,
      listVotes,
      candidates,
    }
  })

  const turnoutPct =
    section.theoreticalVoters > 0 && votersActual != null
      ? (votersActual / section.theoreticalVoters) * 100
      : null

  return NextResponse.json({
    section: {
      id: section.id,
      number: section.number,
      name: section.name,
      locked: section.locked,
      theoreticalVoters: section.theoreticalVoters,
    },
    turnout: turnout
      ? {
          votersActual: turnout.votersActual,
          ballotsValid: turnout.ballotsValid,
          ballotsNull: turnout.ballotsNull,
          ballotsBlank: turnout.ballotsBlank,
          enteredBy: turnout.enteredBy,
          updatedAt: turnout.updatedAt,
        }
      : null,
    turnoutPct,
    listVotesSum,
    sectionWarnings,
    lists: listsDetail.filter(l => l.listVotes > 0 || l.candidates.some(c => c.votes > 0)),
    hasData: !!turnout || listResults.some(r => r.listVotes > 0 || r.preferences.some(p => p.votes > 0)),
  })
}
