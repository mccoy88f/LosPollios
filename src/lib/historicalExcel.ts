import * as XLSX from 'xlsx'

export const HISTORICAL_SHEET_NAME = 'Risultati'

export const HISTORICAL_TEMPLATE_HEADERS = [
  'Nome lista',
  'Coalizione (opz.)',
  'Candidato sindaco (opz.)',
  'Voti',
  'Percentuale',
  'Seggi (opz.)',
] as const

export type HistoricalParsedRow = {
  listName: string
  coalition: string | null
  candidateMayor: string | null
  votes: number
  percentage: number
  seats: number | null
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

  const note = XLSX.utils.aoa_to_sheet([
    ['Istruzioni'],
    ['Compilare il foglio «Risultati»: una riga per lista.'],
    ['Coalizione, candidato sindaco e seggi sono facoltativi (celle vuote).'],
    ['Percentuale: accettati formato italiano (es. 28,5) o numero.'],
    ['Voti: numeri interi; separatore migliaia opzionale (es. 3.200).'],
    ['Importare il file salvato dalla pagina «Elezioni storiche».'],
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
      votes: parseVotes(r[3]),
      percentage: parsePercent(r[4]),
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
        r.votes,
        r.percentage,
        r.seats ?? '',
      ].join(';')
    )
    .join('\n')
}
