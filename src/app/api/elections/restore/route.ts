import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  decodeBackupBuffer,
  restoreElectionBackupCreate,
  summarizeBackupPayload,
} from '@/lib/electionBackup'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file')
  const preview = form.get('preview') === 'true'

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'File backup mancante' }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())

  try {
    const payload = decodeBackupBuffer(buf)
    const summary = summarizeBackupPayload(payload)

    if (preview) {
      return NextResponse.json({ preview: true, summary })
    }

    const { electionId } = await restoreElectionBackupCreate(payload)
    return NextResponse.json({
      ok: true,
      electionId,
      message: 'Elezione ripristinata come nuova copia',
      summary,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ripristino non riuscito'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
