import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  buildCommuneSummaries,
  buildSectionImportsForIstat,
  loadDaitSezioniDataset,
  normalizeIstat,
} from '@/lib/daitSezioniOpenData'

/**
 * Elenco comuni e sezioni dall’open data DAIT (CSV ministeriale).
 * GET ?refresh=1 — forza nuovo download
 * GET ?istat=069022 — anteprima sezioni per un comune (usa cache se valida)
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const force = searchParams.get('refresh') === '1'
  const istatQ = searchParams.get('istat')?.trim()
  const defaultVoters = Math.max(0, parseInt(searchParams.get('defaultVoters') ?? '0', 10) || 0)

  try {
    const { rows, fetchedAt } = await loadDaitSezioniDataset(force)

    if (istatQ) {
      const istat = normalizeIstat(istatQ)
      const sample = rows.find(r => r.istat === istat)
      const sections = buildSectionImportsForIstat(rows, istat, defaultVoters)
      return NextResponse.json({
        sourceUrl: 'https://dait.interno.gov.it/territorio-e-autonomie-locali/sut/open_data/elenco_sezioni_csv.php',
        fetchedAt,
        istat,
        comune: sample?.comune ?? null,
        provincia: sample?.provincia ?? null,
        regione: sample?.regione ?? null,
        sectionCount: sections.length,
        sections,
      })
    }

    const communes = buildCommuneSummaries(rows)
    return NextResponse.json({
      sourceUrl: 'https://dait.interno.gov.it/territorio-e-autonomie-locali/sut/open_data/elenco_sezioni_csv.php',
      fetchedAt,
      communesCount: communes.length,
      totalRows: rows.length,
      communes,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore scaricamento DAIT'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
