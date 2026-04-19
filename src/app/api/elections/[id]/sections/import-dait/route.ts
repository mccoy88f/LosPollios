import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  buildSectionImportsForIstat,
  loadDaitSezioniDataset,
  normalizeIstat,
} from '@/lib/daitSezioniOpenData'
import { assertEligibleSectionsWithinCap } from '@/lib/eligibleVotersCap'

type Params = { params: Promise<{ id: string }> }

/**
 * Import / aggiorna sezioni da open data DAIT per codice ISTAT comune.
 * POST { istat: string, defaultTheoreticalVoters?: number, refresh?: boolean, updateTheoreticalVoters?: boolean }
 * - updateTheoreticalVoters: se true, sovrascrive anche gli aventi diritto al voto in update (default false)
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { id } = await params
  const electionId = Number(id)
  const body = await req.json()
  const istatRaw = typeof body.istat === 'string' ? body.istat.trim() : ''
  if (!istatRaw) {
    return NextResponse.json({ error: 'Codice ISTAT comune obbligatorio' }, { status: 400 })
  }

  const defaultTheoreticalVoters = Math.max(0, Number(body.defaultTheoreticalVoters) || 0)
  const updateTheoreticalVoters = body.updateTheoreticalVoters === true
  const refresh = body.refresh === true

  const election = await prisma.election.findUnique({ where: { id: electionId } })
  if (!election) {
    return NextResponse.json({ error: 'Elezione non trovata' }, { status: 404 })
  }

  try {
    await loadDaitSezioniDataset(refresh)
    const { rows, fetchedAt } = await loadDaitSezioniDataset(false)
    const istat = normalizeIstat(istatRaw)
    const payload = buildSectionImportsForIstat(rows, istat, defaultTheoreticalVoters)

    if (!payload.length) {
      return NextResponse.json(
        { error: `Nessuna sezione trovata per il codice ISTAT ${istat}` },
        { status: 404 }
      )
    }

    const created = await prisma.$transaction(async tx => {
      for (const s of payload) {
        await tx.section.upsert({
          where: { electionId_number: { electionId, number: s.number } },
          create: {
            electionId,
            number: s.number,
            name: s.name,
            location: s.location,
            theoreticalVoters: s.theoreticalVoters,
            order: s.number,
          },
          update: {
            name: s.name,
            location: s.location,
            ...(updateTheoreticalVoters ? { theoreticalVoters: s.theoreticalVoters } : {}),
          },
        })
      }
      await assertEligibleSectionsWithinCap(electionId, tx)
      return tx.section.findMany({
        where: { electionId },
        orderBy: { number: 'asc' },
      })
    })

    return NextResponse.json({
      ok: true,
      fetchedAt,
      istat,
      comune: rows.find(r => r.istat === istat)?.comune,
      count: created.length,
      sections: created,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore import DAIT'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
