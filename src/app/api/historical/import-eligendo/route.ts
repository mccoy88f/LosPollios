import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  fetchEligendoPage,
  isAllowedEligendoUrl,
  parseEligendoResultsHtml,
} from '@/lib/eligendoImport'
import { applyEligendoMacroToElection, canImportMacroToElection } from '@/lib/archivedElectionImport'
import { normalizeFullNameLabel } from '@/lib/personUtils'

/**
 * Importa risultati da una pagina dell'Archivio Eligendo (Ministero dell'Interno).
 * POST { url: string, preview?: boolean, notes?: string }
 * - preview true: restituisce solo meta + results senza salvare
 * - preview false/omit: crea HistoricalElection + risultati, oppure se targetElectionId (elezione archiviata) applica macro lì
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { url, preview, notes, targetElectionId } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL obbligatorio' }, { status: 400 })
  }
  const trimmed = url.trim()
  if (!isAllowedEligendoUrl(trimmed)) {
    return NextResponse.json(
      { error: 'Consentiti solo URL del dominio elezionistorico.interno.gov.it' },
      { status: 400 }
    )
  }

  let html: string
  try {
    html = await fetchEligendoPage(trimmed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore di rete'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const parsed = parseEligendoResultsHtml(html, trimmed)
  if (!parsed.results.length) {
    return NextResponse.json(
      {
        error:
          'Nessun dato estratto. Verifica che il link sia una pagina risultati comunali con tabella liste (Archivio Eligendo).',
        parsed,
      },
      { status: 422 }
    )
  }

  if (preview === true) {
    let macroTarget: { electionId: number; canImport: boolean; reason?: string } | undefined
    if (targetElectionId != null && Number.isFinite(Number(targetElectionId))) {
      const chk = await canImportMacroToElection(Number(targetElectionId))
      macroTarget = {
        electionId: Number(targetElectionId),
        canImport: chk.ok,
        reason: chk.reason,
      }
    }
    return NextResponse.json({
      preview: true,
      ...parsed,
      notesSuggested: `Import da Eligendo\n${trimmed}\n${parsed.titleRaw}`,
      macroTarget,
    })
  }

  const noteBlock = [notes?.trim(), `Fonte: ${trimmed}`, parsed.titleRaw].filter(Boolean).join('\n')

  if (targetElectionId != null && Number.isFinite(Number(targetElectionId))) {
    const eid = Number(targetElectionId)
    try {
      const election = await applyEligendoMacroToElection(eid, parsed, noteBlock)
      return NextResponse.json(
        { preview: false, targetElectionId: eid, election, parsed, mode: 'archived_election' },
        { status: 200 }
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import non riuscito'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  const a = parsed.affluenza
  const election = await prisma.historicalElection.create({
    data: {
      name: parsed.name,
      commune: parsed.commune,
      year: parsed.year,
      notes: noteBlock,
      ...(a.registeredVoters != null && { registeredVoters: a.registeredVoters }),
      ...(a.turnoutVoters != null && { turnoutVoters: a.turnoutVoters }),
      ...(a.turnoutPercent != null && { turnoutPercent: a.turnoutPercent }),
      ...(a.ballotsBlank != null && { ballotsBlank: a.ballotsBlank }),
      ...(a.ballotsInvalidInclBlank != null && { ballotsInvalidInclBlank: a.ballotsInvalidInclBlank }),
      results: {
        create: parsed.results.map(r => ({
          listName: r.listName,
          candidateMayor: normalizeFullNameLabel(r.candidateMayor),
          coalition: r.coalition,
          votes: r.votes,
          percentage: r.percentage,
          seats: r.seats,
          listLogoUrl: r.listLogoUrl,
          coalitionLogoUrl: null,
        })),
      },
    },
    include: { results: { orderBy: { votes: 'desc' } } },
  })

  return NextResponse.json({ preview: false, election, parsed }, { status: 201 })
}
