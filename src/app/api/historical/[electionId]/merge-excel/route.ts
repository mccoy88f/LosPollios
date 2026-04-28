import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { mergeHistoricalElectionFromExcel } from '@/lib/historicalStoricoImport'
import type { HistoricalCandidateRow, HistoricalParsedRow } from '@/lib/historicalExcel'

type Params = { params: Promise<{ electionId: string }> }

/**
 * POST { lists?: HistoricalParsedRow[], candidates?: HistoricalCandidateRow[] }
 * Merge su HistoricalElection: colonne vuote (voti/%) non sovrascrivono il DB.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { electionId: idStr } = await params
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
      { error: 'Serve almeno un foglio «Risultati» o «Candidati» con dati' },
      { status: 400 }
    )
  }

  try {
    const election = await mergeHistoricalElectionFromExcel(electionId, lists, candidates)
    return NextResponse.json({
      election,
      listsMerged: lists.length,
      candidateRows: candidates.length,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Import non riuscito'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
