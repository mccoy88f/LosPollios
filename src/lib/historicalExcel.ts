import * as XLSX from 'xlsx'

export const HISTORICAL_SHEET_NAME = 'Risultati'

export const HISTORICAL_TEMPLATE_HEADERS = [
  'Nome lista',
  'Coalizione (opz.)',
  'Candidato sindaco (opz.)',
  'Voti',
  'Percentuale (opz.)',
  'Seggi (opz.)',
] as const

export type HistoricalParsedRow = {
  listName: string
  coalition: string | null
  candidateMayor: string | null
  /** null = in reimport non aggiornare i voti in DB */
  votes: number | null
  /** null = in reimport non aggiornare la % in DB (es. foglio con solo candidati) */
  percentage: number | null
  seats: number | null
}

export const HISTORICAL_CANDIDATES_SHEET = 'Candidati'

export type HistoricalCandidateRow = {
  listName: string
  lastName: string
  firstName: string
  order: number
  /** Preferenze sulla sezione sintesi (n. 0); null = non aggiornare voti */
  preferenceVotes: number | null
}

function cellStr(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'number') return String(v)
  return String(v).trim()
}

function parseVotes(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return Math.round(v)
  const s = String(v ?? '').trim()
  if (!s) return 0
  const noSpace = s.replace(/\s/g, '')
  if (/^\d+$/.test(noSpace)) return parseInt(noSpace, 10)
  const itThousands = noSpace.replace(/\./g, '')
  const n = parseInt(itThousands, 10)
  return Number.isNaN(n) ? 0 : n
}

function parsePercent(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const s = String(v ?? '')
    .trim()
    .replace('%', '')
    .replace(/\s/g, '')
  if (!s) return 0
  const n = parseFloat(s.replace(',', '.'))
  return Number.isNaN(n) ? 0 : n
}

/** Cella vuota → null (reimport parziale); altrimenti come parsePercent */
function parsePercentOptional(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const s = String(v)
    .trim()
    .replace('%', '')
    .replace(/\s/g, '')
  if (!s) return null
  const n = parseFloat(s.replace(',', '.'))
  return Number.isNaN(n) ? null : n
}

/** Cella vuota → null (non aggiornare voti lista in merge) */
function parseVotesOptional(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = parseVotes(v)
  return n
}

function parseSeats(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && !Number.isNaN(v)) return Math.round(v)
  const s = String(v).trim()
  if (!s) return null
  const n = parseInt(s, 10)
  return Number.isNaN(n) ? null : n
}

function rowLooksLikeHeader(cells: string[]): boolean {
  const joined = cells.join(' ').toLowerCase()
  return joined.includes('nome') && joined.includes('lista')
}

export function downloadHistoricalExcelTemplate(filename = 'lospollios-modello-elezione-storica.xlsx'): void {
  const wb = XLSX.utils.book_new()
  const data: (string | number)[][] = [
    [...HISTORICAL_TEMPLATE_HEADERS],
    ['Lista Civica Esempio', 'Centro-Sinistra', 'Mario Rossi', 3200, 28.5, 10],
    ['Lista Demo', '', 'Anna Verdi', 2800, 24.9, 9],
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 26 }, { wch: 20 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws, HISTORICAL_SHEET_NAME)

  const candidati: (string | number)[][] = [
    ['Nome lista', 'Cognome', 'Nome', 'Ordine', 'Voti preferenza (opz.)'],
    ['Lista Civica Esempio', 'Rossi', 'Mario', 1, 120],
    ['Lista Civica Esempio', 'Bianchi', 'Laura', 2, 85],
  ]
  const wsCand = XLSX.utils.aoa_to_sheet(candidati)
  wsCand['!cols'] = [{ wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsCand, HISTORICAL_CANDIDATES_SHEET)

  const note = XLSX.utils.aoa_to_sheet([
    ['Istruzioni'],
    ['Foglio «Risultati»: macro per lista (come Eligendo).'],
    ['Foglio «Candidati»: dettaglio candidati e preferenze sulla sintesi comunale (dopo il macro).'],
    ['Coalizione, candidato sindaco e seggi sono facoltativi (celle vuote).'],
    ['Percentuale (opz.): vuota al reimport su storico = non sovrascrivere; vuota su nuovo record = calcolo dai voti.'],
    ['Voti: numeri interi; separatore migliaia opzionale (es. 3.200).'],
    ['Import: pagina «Dati storici» o elezione archiviata.'],
  ])
  note['!cols'] = [{ wch: 72 }]
  XLSX.utils.book_append_sheet(wb, note, 'Istruzioni')

  XLSX.writeFile(wb, filename)
}

export function parseHistoricalExcel(buffer: ArrayBuffer): HistoricalParsedRow[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName =
    wb.SheetNames.find(n => n === HISTORICAL_SHEET_NAME) ?? wb.SheetNames[0]
  if (!sheetName) return []

  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][]

  const out: HistoricalParsedRow[] = []
  let start = 0
  if (rows.length > 0) {
    const first = (rows[0] as unknown[]).map(c => cellStr(c))
    if (rowLooksLikeHeader(first)) start = 1
  }

  for (let i = start; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    const listName = cellStr(r[0])
    if (!listName) continue

    out.push({
      listName,
      coalition: cellStr(r[1]) || null,
      candidateMayor: cellStr(r[2]) || null,
      votes: parseVotesOptional(r[3]),
      percentage: parsePercentOptional(r[4]),
      seats: parseSeats(r[5]),
    })
  }

  return out
}

export function historicalRowsToSemicolonLines(rows: HistoricalParsedRow[]): string {
  return rows
    .map(r =>
      [
        r.listName,
        r.coalition ?? '',
        r.candidateMayor ?? '',
        r.votes ?? '',
        r.percentage ?? '',
        r.seats ?? '',
      ].join(';')
    )
    .join('\n')
}

/** Per creazione nuova elezione storica: voti obbligatori; % assenti calcolate sui totali. */
export function normalizeHistoricalRowsForCreate(
  rows: HistoricalParsedRow[]
): Array<
  Omit<HistoricalParsedRow, 'votes' | 'percentage'> & { votes: number; percentage: number }
> {
  const out: Array<
    Omit<HistoricalParsedRow, 'votes' | 'percentage'> & { votes: number; percentage: number }
  > = []
  let totalVotes = 0
  for (const r of rows) {
    if (r.votes == null) {
      throw new Error(`Voti mancanti per la lista «${r.listName}»`)
    }
    totalVotes += r.votes
  }
  for (const r of rows) {
    const votes = r.votes!
    const percentage =
      r.percentage != null
        ? r.percentage
        : totalVotes > 0
          ? Math.round((10000 * votes) / totalVotes) / 100
          : 0
    out.push({
      listName: r.listName,
      coalition: r.coalition,
      candidateMayor: r.candidateMayor,
      votes,
      percentage,
      seats: r.seats,
    })
  }
  return out
}

export type HistoricalPrefillListRow = {
  listName: string
  coalition: string | null
  candidateMayor: string | null
  votes: number
  percentage: number
  seats: number | null
}

export type HistoricalPrefillCouncilRow = {
  listName: string
  lastName: string
  firstName: string
  order: number
  preferenceVotes: number | null
}

function slugFilePart(s: string, max = 32): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\w\-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max) || 'comune'
}

/**
 * Excel con foglio «Risultati» uguale all’elezione corrente e «Candidati» con righe esistenti
 * oppure una riga segnaposto per lista (cognome/nome vuoti) da compilare a mano.
 */
export function downloadHistoricalElectionPrefillXlsx(
  meta: { electionName: string; commune: string; year: number; filename?: string },
  lists: HistoricalPrefillListRow[],
  candidates: HistoricalPrefillCouncilRow[]
): void {
  const wb = XLSX.utils.book_new()

  const risultati: (string | number)[][] = [
    [...HISTORICAL_TEMPLATE_HEADERS],
    ...lists.map(l => [
      l.listName,
      l.coalition ?? '',
      l.candidateMayor ?? '',
      l.votes,
      Number.isFinite(l.percentage) ? Math.round(l.percentage * 100) / 100 : '',
      l.seats ?? '',
    ]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(risultati)
  ws['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 24 }, { wch: 10 }, { wch: 14 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws, HISTORICAL_SHEET_NAME)

  const candidati: (string | number)[][] = [
    ['Nome lista', 'Cognome', 'Nome', 'Ordine', 'Voti preferenza (opz.)'],
  ]
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

  for (const l of lists) {
    const forList = candidates.filter(c => norm(c.listName) === norm(l.listName))
    if (forList.length > 0) {
      for (const c of forList) {
        candidati.push([
          l.listName,
          c.lastName,
          c.firstName,
          c.order,
          c.preferenceVotes != null ? c.preferenceVotes : '',
        ])
      }
    } else {
      candidati.push([l.listName, '', '', 1, ''])
    }
  }

  const wsCand = XLSX.utils.aoa_to_sheet(candidati)
  wsCand['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsCand, HISTORICAL_CANDIDATES_SHEET)

  const note = XLSX.utils.aoa_to_sheet([
    ['Istruzioni — dopo Eligendo'],
    ['Foglio «Risultati»: di solito non serve modificarlo. Puoi lasciare vuota la colonna «Percentuale (opz.)» al reimport.'],
    ['Foglio «Candidati»: compila cognome, nome, ordine e voti preferenza per ogni candidato.'],
    ['Reimport: dalla stessa scheda elezione storica usa «Reimporta Excel»; le liste si aggiornano solo per celle compilate.'],
  ])
  note['!cols'] = [{ wch: 78 }]
  XLSX.utils.book_append_sheet(wb, note, 'Istruzioni')

  const fn =
    meta.filename ??
    `storico-${meta.year}-${slugFilePart(meta.commune)}-candidati.xlsx`
  XLSX.writeFile(wb, fn)
}

function candidateHeaderRow(cells: string[]): boolean {
  const j = cells.join(' ').toLowerCase()
  return j.includes('cognome') && j.includes('nome') && j.includes('lista')
}

export function parseHistoricalCandidatesSheet(buffer: ArrayBuffer): HistoricalCandidateRow[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames.find(n => n === HISTORICAL_CANDIDATES_SHEET)
  if (!sheetName) return []

  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][]

  const out: HistoricalCandidateRow[] = []
  let start = 0
  if (rows.length > 0) {
    const first = (rows[0] as unknown[]).map(c => cellStr(c))
    if (candidateHeaderRow(first)) start = 1
  }

  for (let i = start; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    const listName = cellStr(r[0])
    const lastName = cellStr(r[1])
    if (!listName || !lastName) continue
    const firstName = cellStr(r[2])
    const orderRaw = r[3]
    const order =
      typeof orderRaw === 'number' && !Number.isNaN(orderRaw)
        ? Math.round(orderRaw)
        : parseInt(cellStr(orderRaw), 10) || 1
    const pv = r[4]
    let preferenceVotes: number | null = null
    if (pv !== '' && pv != null) {
      const n = parseVotes(pv)
      preferenceVotes = n
    }

    out.push({ listName, lastName, firstName: firstName || '—', order, preferenceVotes })
  }

  return out
}

/** Legge foglio Risultati + opzionale Candidati */
export function parseHistoricalExcelFull(buffer: ArrayBuffer): {
  lists: HistoricalParsedRow[]
  candidates: HistoricalCandidateRow[]
} {
  return {
    lists: parseHistoricalExcel(buffer),
    candidates: parseHistoricalCandidatesSheet(buffer),
  }
}
