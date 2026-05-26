import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import type { AccessParsedRow } from '@/lib/accessExcel'
import { importUsers, resolveImportRowsForElection } from '@/lib/userAdmin'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { id } = await params
  const electionId = Number(id)
  if (!Number.isFinite(electionId)) {
    return NextResponse.json({ error: 'Elezione non valida' }, { status: 400 })
  }

  const body = await req.json()
  const rows = body?.rows as AccessParsedRow[] | undefined
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Nessuna riga da importare' }, { status: 400 })
  }

  const { inputs, errors: resolveErrors } = await resolveImportRowsForElection(electionId, rows)
  if (inputs.length === 0 && resolveErrors.length > 0) {
    return NextResponse.json({ created: 0, errors: resolveErrors }, { status: 400 })
  }

  const importResult = await importUsers(inputs)
  const errors = [...resolveErrors, ...importResult.errors]

  return NextResponse.json({
    created: importResult.created,
    errors,
    skipped: errors.length,
  })
}
