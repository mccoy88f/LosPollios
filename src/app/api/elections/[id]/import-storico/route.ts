import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  applyCandidateRowsToElection,
  applyExcelMacroToElection,
} from '@/lib/archivedElectionImport'
import type { HistoricalCandidateRow, HistoricalParsedRow } from '@/lib/historicalExcel'

type Params = { params: Promise<{ id: string }> }

/**
 * Import macro liste + opzionale candidati (Excel) su elezione archiviata.
 * Body: { lists?: HistoricalParsedRow[], candidates?: HistoricalCandidateRow[] }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { id: idStr } = await params
  const electionId = Number(idStr)
  if (!Number.isFinite(electionId)) {
    return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  }

  let body: { lists?: HistoricalParsedRow[]; candidates?: HistoricalCandidateRow[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 })
  }

  const lists = Array.isArray(body.lists) ? body.lists : []
  const candidates = Array.isArray(body.candidates) ? body.candidates : []

  if (lists.length === 0 && candidates.length === 0) {
    return NextResponse.json(
      { error: 'Serve almeno un elenco «lists» o «candidates» non vuoto' },
      { status: 400 }
    )
  }

  try {
    let election = null
    if (lists.length > 0) {
      election = await applyExcelMacroToElection(electionId, lists)
    }
    if (candidates.length > 0) {
      election = await applyCandidateRowsToElection(electionId, candidates)
    }
    if (!election) {
      return NextResponse.json({ error: 'Nessun dato importato' }, { status: 400 })
    }

    return NextResponse.json({ election, listsImported: lists.length, candidatesImported: candidates.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Import non riuscito'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
