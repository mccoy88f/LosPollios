import prisma from '@/lib/db'
import * as XLSX from 'xlsx'

/** Percentuale arrotondata (num/den)×100 oppure vuoto */
function pctValue(num: number, den: number): number | null {
  if (den <= 0) return null
  return Math.round((num / den) * 10000) / 100
}

function sanitizeFilenamePart(s: string): string {
  return s.replace(/[^\wÀ-ÿ\-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'elezione'
}

/** Nome file consigliato per il download client */
export function electionReportFilename(electionName: string, electionId: number): string {
  const base = sanitizeFilenamePart(electionName)
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')
  return `lospollios-${base}-${electionId}-${stamp}.xlsx`
}

export async function buildElectionReportXlsxBuffer(electionId: number): Promise<{
  buffer: Buffer
  filename: string
} | null> {
  const election = await prisma.election.findUnique({
    where: { id: electionId },
    include: {
      lists: { orderBy: { order: 'asc' }, include: { candidates: { orderBy: { order: 'asc' } } } },
    },
  })

  if (!election) return null

  const [sections, turnouts, listResults] = await Promise.all([
    prisma.section.findMany({
      where: { electionId },
      orderBy: { number: 'asc' },
    }),
    prisma.sectionTurnout.findMany({ where: { electionId } }),
    prisma.sectionListResult.findMany({
      where: { section: { electionId } },
      include: {
        list: true,
        section: true,
        preferences: { include: { candidate: true } },
      },
    }),
  ])

  const turnoutBySection = new Map(turnouts.map(t => [t.sectionId, t]))
  const resultsBySectionId = listResults.reduce(
    (m, r) => {
      if (!m.has(r.sectionId)) m.set(r.sectionId, [])
      m.get(r.sectionId)!.push(r)
      return m
    },
    new Map<number, typeof listResults>()
  )

  const listVotesGlobal = new Map<number, number>()
  for (const r of listResults) {
    listVotesGlobal.set(r.listId, (listVotesGlobal.get(r.listId) ?? 0) + r.listVotes)
  }
  const totalListVotesElection = [...listVotesGlobal.values()].reduce((a, b) => a + b, 0)
  const totalActualVoters = turnouts.reduce((s, t) => s + t.votersActual, 0)
  const totalTheoretical = sections.reduce((s, sec) => s + sec.theoreticalVoters, 0)

  const wb = XLSX.utils.book_new()

  const infoAoA = [
    ['LosPollios — report voti'],
    [],
    ['Elezione', election.name],
    ['Comune', election.commune],
    ['Generato UTC', new Date().toISOString()],
    [],
    ['Legenda'],
    ['Dove compare una percentuale trovi anche la base numerica usata:',
     'colonne «Numeratore», «Denominatore» o i valori assoluti sulla stessa riga (es. voti lista e votanti sezione).'],
    [],
    ['Riepilogo scrutinio comunale'],
    ['Votanti reali registrati', totalActualVoters],
    ['Aventi diritto (somma sezioni)', totalTheoretical],
    ['Totale suffragi di lista scrutinati', totalListVotesElection],
    [
      '% scrutini liste su votanti (comun.)',
      pctValue(totalListVotesElection, totalActualVoters) ?? '(nessun votante registrato)',
    ],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoAoA), 'Info')

  const listeHeaders = [
    'Lista',
    'Coalizione',
    'Voti lista (N)',
    'Tot. scrutinio comunale liste (D1)',
    '% N su D1',
    'Votanti reali comunali (D2)',
    '% N su D2',
  ]
  const listeRows: (string | number | null)[][] = [listeHeaders]
  for (const list of election.lists) {
    const n = listVotesGlobal.get(list.id) ?? 0
    const p1 = pctValue(n, totalListVotesElection)
    const p2 = pctValue(n, totalActualVoters)
    listeRows.push([
      list.shortName ?? list.name,
      list.coalition ?? '',
      n,
      totalListVotesElection,
      p1 ?? '',
      totalActualVoters,
      p2 ?? '',
    ])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(listeRows), 'Liste')

  const listsOrdered = [...election.lists]
  const sezioniHeader: string[] = [
    'N°',
    'Nome',
    'Aventi diritto sez.',
    'Votanti reali',
    'Schede valide',
    'Schede nulle',
    'Schede bianche',
    'Σ voti lista sez.',
    'Affluenza % su aventi sez.',
    'Affluenza denom. (base %)',
    'Scrutinio liste % su votanti sez.',
    'Scrutinio denom. (base %)',
  ]
  for (const l of listsOrdered) {
    const label = l.shortName ?? l.name.slice(0, 20)
    sezioniHeader.push(`Voti: ${label}`, `% lista su votant. sez. (${label})`)
  }
  const sezioniRows: (string | number | null)[][] = [sezioniHeader]

  for (const sec of sections) {
    const t = turnoutBySection.get(sec.id)
    const voters = t?.votersActual ?? null
    const ballotsValid = t?.ballotsValid ?? null
    const ballotsNull = t?.ballotsNull ?? null
    const ballotsBlank = t?.ballotsBlank ?? null
    const sectionRes = resultsBySectionId.get(sec.id) ?? []
    const votesByListId = new Map(sectionRes.map(r => [r.listId, r.listVotes]))
    const listVotesSumSection = sectionRes.reduce((s, r) => s + r.listVotes, 0)

    const affPct = pctValue(voters ?? 0, sec.theoreticalVoters)
    const scrutPctSection = pctValue(listVotesSumSection, voters ?? 0)

    const row: (string | number | null)[] = [
      sec.number,
      sec.name ?? '',
      sec.theoreticalVoters,
      voters ?? '',
      ballotsValid ?? '',
      ballotsNull ?? '',
      ballotsBlank ?? '',
      listVotesSumSection,
      affPct ?? '',
      sec.theoreticalVoters,
      scrutPctSection ?? '',
      voters ?? '',
    ]

    for (const l of listsOrdered) {
      const v = votesByListId.get(l.id) ?? 0
      row.push(v, pctValue(v, voters ?? 0) ?? '')
    }
    sezioniRows.push(row)
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sezioniRows), 'Sezioni')

  const prefHeaders = [
    'N° sez.',
    'Sezione',
    'Lista',
    'Candidato',
    'Preferenze (N)',
    'Voti lista sez.-lista (D)',
    '% N su D',
  ]
  const prefRows: (string | number | null)[][] = [prefHeaders]

  const sortedPrefs = [...listResults].sort(
    (a, b) => a.section.number - b.section.number || a.listId - b.listId || a.id - b.id
  )

  for (const r of sortedPrefs) {
    for (const p of [...r.preferences].sort((a, b) => a.candidate.order - b.candidate.order)) {
      const n = p.votes
      const d = r.listVotes
      prefRows.push([
        r.section.number,
        r.section.name ?? '',
        r.list.shortName ?? r.list.name,
        `${p.candidate.firstName} ${p.candidate.lastName}`,
        n,
        d,
        pctValue(n, d) ?? '',
      ])
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(prefRows), 'Pref_sezione')

  const candAgg = new Map<
    number,
    { listId: number; name: string; listLabel: string; prefSum: number }
  >()
  for (const r of listResults) {
    const listLabel = r.list.shortName ?? r.list.name
    for (const p of r.preferences) {
      const id = p.candidateId
      const name = `${p.candidate.firstName} ${p.candidate.lastName}`
      if (!candAgg.has(id)) {
        candAgg.set(id, { listId: r.listId, name, listLabel, prefSum: 0 })
      }
      candAgg.get(id)!.prefSum += p.votes
    }
  }

  const totCandHeader = ['Candidato', 'Lista', 'Somma preferenze comunale (N)', 'Tot. voti lista lista (D)', '% N su D']
  const totCandRows: (string | number | null)[][] = [totCandHeader]

  const sortedCandidates = [...candAgg.entries()].sort((a, b) => {
    const lista = election.lists.find(l => l.id === a[1].listId)
    const listb = election.lists.find(l => l.id === b[1].listId)
    const oa = lista?.order ?? 0
    const ob = listb?.order ?? 0
    if (oa !== ob) return oa - ob
    return a[1].name.localeCompare(b[1].name, 'it')
  })

  for (const [, c] of sortedCandidates) {
    const dv = listVotesGlobal.get(c.listId) ?? 0
    totCandRows.push([c.name, c.listLabel, c.prefSum, dv, pctValue(c.prefSum, dv) ?? ''])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(totCandRows), 'Pref_totali')

  const buffer = Buffer.from(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }))
  const filename = electionReportFilename(election.name, election.id)
  return { buffer, filename }
}
