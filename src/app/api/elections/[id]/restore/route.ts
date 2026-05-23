import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import {
  decodeBackupBuffer,
  electionNamesMatchForConfirm,
  getElectionDataCounts,
  restoreElectionBackupOverwrite,
  summarizeBackupPayload,
} from '@/lib/electionBackup'
import { ssePublish } from '@/lib/sse'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { id } = await params
  const electionId = Number(id)
  if (!Number.isFinite(electionId)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  const form = await req.formData()
  const file = form.get('file')
  const preview = form.get('preview') === 'true'
  const confirmName = String(form.get('confirmName') ?? '').trim()

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'File backup mancante' }, { status: 400 })
  }

  const election = await prisma.election.findUnique({
    where: { id: electionId },
    select: { id: true, name: true },
  })
  if (!election) {
    return NextResponse.json({ error: 'Elezione non trovata' }, { status: 404 })
  }

  const buf = Buffer.from(await file.arrayBuffer())

  try {
    const payload = decodeBackupBuffer(buf)
    const summary = summarizeBackupPayload(payload)
    const currentCounts = await getElectionDataCounts(electionId)

    if (preview) {
      return NextResponse.json({
        preview: true,
        summary,
        current: {
          electionId: election.id,
          electionName: election.name,
          counts: currentCounts,
        },
      })
    }

    if (!confirmName) {
      return NextResponse.json(
        { error: 'Conferma obbligatoria: indica il nome esatto dell’elezione da sovrascrivere' },
        { status: 400 }
      )
    }

    if (!electionNamesMatchForConfirm(confirmName, election.name)) {
      return NextResponse.json(
        { error: 'Il nome di conferma non coincide con l’elezione attuale' },
        { status: 400 }
      )
    }

    await restoreElectionBackupOverwrite(electionId, payload)
    ssePublish(electionId, { type: 'section_updated', sectionId: 0, by: session.username })

    return NextResponse.json({
      ok: true,
      electionId,
      message: 'Elezione sovrascritta dal backup',
      summary,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ripristino non riuscito'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
