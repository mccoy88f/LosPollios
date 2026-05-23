import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { encodeBackupGzip, exportElectionBackup } from '@/lib/electionBackup'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { id } = await params
  const electionId = Number(id)
  if (!Number.isFinite(electionId)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  try {
    const payload = await exportElectionBackup(electionId)
    const safeName = payload.election.name.replace(/[^\w\s-]/gi, '').trim().replace(/\s+/g, '-') || 'elezione'
    const date = payload.exportedAt.slice(0, 10)
    const filename = `lospollios-${safeName}-${date}.json.gz`
    const body = encodeBackupGzip(payload)

    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Export non riuscito'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
