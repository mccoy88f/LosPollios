import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { ssePublish } from '@/lib/sse'

type Params = { params: Promise<{ id: string; sectionId: string }> }

// GET: ritorna i dati già inseriti per questa sezione
export async function GET(_req: NextRequest, { params }: Params) {
  const { id, sectionId } = await params
  const electionId = Number(id)

  const section = await prisma.section.findUnique({
    where: { id: Number(sectionId) },
    include: {
      turnout: true,
      listResults: {
        include: {
          list: { include: { candidates: { orderBy: { order: 'asc' } } } },
          preferences: true,
        },
      },
    },
  })
  if (!section) return NextResponse.json({ error: 'Sezione non trovata' }, { status: 404 })

  const lists = await prisma.electionList.findMany({
    where: { electionId },
    orderBy: { order: 'asc' },
    include: { candidates: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json({ section, lists })
}

// POST: inserisce / aggiorna i risultati di una sezione
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role === 'viewer') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { id, sectionId } = await params
  const electionId = Number(id)
  const secId = Number(sectionId)
  const body = await req.json()

  const sectionRow = await prisma.section.findUnique({
    where: { id: secId },
    include: { election: true },
  })
  if (!sectionRow || sectionRow.electionId !== electionId) {
    return NextResponse.json({ error: 'Sezione non trovata' }, { status: 404 })
  }
  if (session.role === 'entry') {
    if (sectionRow.election.archived || sectionRow.locked) {
      return NextResponse.json(
        { error: sectionRow.election.archived ? 'Elezione archiviata: modifiche non consentite' : 'Sezione chiusa dall’amministratore: modifiche non consentite' },
        { status: 403 }
      )
    }
  }

  /*
    Expected body:
    {
      turnout: { votersActual, ballotsValid?, ballotsNull?, ballotsBlank? },
      lists: [
        {
          listId: number,
          listVotes: number,
          preferences: [{ candidateId, votes }]
        }
      ]
    }
  */

  const username = session.username

  await prisma.$transaction(async (tx) => {
    // Upsert turnout
    if (body.turnout) {
      await tx.sectionTurnout.upsert({
        where: { sectionId: secId },
        update: {
          votersActual: Number(body.turnout.votersActual),
          ballotsValid: body.turnout.ballotsValid !== undefined ? Number(body.turnout.ballotsValid) : undefined,
          ballotsNull:  body.turnout.ballotsNull  !== undefined ? Number(body.turnout.ballotsNull)  : undefined,
          ballotsBlank: body.turnout.ballotsBlank !== undefined ? Number(body.turnout.ballotsBlank) : undefined,
          enteredBy: username,
        },
        create: {
          sectionId: secId,
          electionId,
          votersActual: Number(body.turnout.votersActual),
          ballotsValid: body.turnout.ballotsValid !== undefined ? Number(body.turnout.ballotsValid) : null,
          ballotsNull:  body.turnout.ballotsNull  !== undefined ? Number(body.turnout.ballotsNull)  : null,
          ballotsBlank: body.turnout.ballotsBlank !== undefined ? Number(body.turnout.ballotsBlank) : null,
          enteredBy: username,
        },
      })
    }

    // Upsert list results
    for (const lr of (body.lists ?? [])) {
      const result = await tx.sectionListResult.upsert({
        where: { sectionId_listId: { sectionId: secId, listId: Number(lr.listId) } },
        update: { listVotes: Number(lr.listVotes), enteredBy: username },
        create: {
          sectionId: secId,
          listId: Number(lr.listId),
          listVotes: Number(lr.listVotes),
          enteredBy: username,
        },
      })

      // Upsert preferences
      for (const pref of (lr.preferences ?? [])) {
        await tx.candidatePreference.upsert({
          where: { sectionResultId_candidateId: { sectionResultId: result.id, candidateId: Number(pref.candidateId) } },
          update: { votes: Number(pref.votes), enteredBy: username },
          create: {
            sectionResultId: result.id,
            candidateId: Number(pref.candidateId),
            votes: Number(pref.votes),
            enteredBy: username,
          },
        })
      }
    }
  })

  // Notify SSE listeners
  ssePublish(electionId, { type: 'section_updated', sectionId: secId, by: username })

  return NextResponse.json({ ok: true })
}
