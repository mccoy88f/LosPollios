import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { buildElectionReportXlsxBuffer } from '@/lib/electionReportXlsx'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { id } = await params
  const electionId = Number(id)
  if (!Number.isFinite(electionId)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  const built = await buildElectionReportXlsxBuffer(electionId)
  if (!built) return NextResponse.json({ error: 'Elezione non trovata' }, { status: 404 })

  const safeAscii = `lospollios-report-${electionId}.xlsx`
  const utf8Name = encodeURIComponent(built.filename)

  return new NextResponse(new Uint8Array(built.buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeAscii}"; filename*=UTF-8''${utf8Name}`,
      'Cache-Control': 'no-store',
    },
  })
}
