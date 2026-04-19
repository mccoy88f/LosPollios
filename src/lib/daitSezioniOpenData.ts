/** Open data Ministero dell’Interno — elenco sezioni elettorali (CSV). */
export const DAIT_ELENCO_SEZIONI_CSV_URL =
  'https://dait.interno.gov.it/territorio-e-autonomie-locali/sut/open_data/elenco_sezioni_csv.php'

export type DaitSezioneRow = {
  regione: string
  provincia: string
  comune: string
  istat: string
  numeroSezione: number
  indirizzo: string
  descrizionePlesso: string
  ubicazione: string
  ospedaliera: string
}

export type DaitCommuneSummary = {
  istat: string
  comune: string
  provincia: string
  regione: string
  sectionCount: number
}

export type DaitSectionImport = {
  number: number
  name: string
  location: string | null
  theoreticalVoters: number
}

/** Es. ="069001" o 069001 → 069001 */
export function normalizeIstat(cell: string): string {
  let s = cell.trim()
  if (s.startsWith('=')) s = s.slice(1)
  s = s.replace(/^["']|["']$/g, '').trim()
  return s
}

export function parseDaitSezioniCsv(text: string): DaitSezioneRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const headerIdx = lines.findIndex(l => /^REGIONE\s*;/i.test(l))
  if (headerIdx < 0) return []

  const rows: DaitSezioneRow[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    const parts = line.split(';')
    if (parts.length < 9) continue

    const num = parseInt(parts[4].trim(), 10)
    if (Number.isNaN(num)) continue

    rows.push({
      regione: parts[0].trim(),
      provincia: parts[1].trim(),
      comune: parts[2].trim(),
      istat: normalizeIstat(parts[3]),
      numeroSezione: num,
      indirizzo: (parts[5] ?? '').trim(),
      descrizionePlesso: (parts[6] ?? '').trim(),
      ubicazione: (parts[7] ?? '').trim(),
      ospedaliera: (parts[8] ?? '').trim(),
    })
  }
  return rows
}

export function buildCommuneSummaries(rows: DaitSezioneRow[]): DaitCommuneSummary[] {
  const map = new Map<string, DaitCommuneSummary>()
  for (const r of rows) {
    const k = r.istat
    const ex = map.get(k)
    if (ex) ex.sectionCount++
    else {
      map.set(k, {
        istat: r.istat,
        comune: r.comune,
        provincia: r.provincia,
        regione: r.regione,
        sectionCount: 1,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.comune.localeCompare(b.comune, 'it', { sensitivity: 'base' })
  )
}

function buildSectionName(r: DaitSezioneRow): string {
  const u = r.ubicazione
  const d = r.descrizionePlesso
  if (u && d) return `${u} — ${d}`.slice(0, 255)
  if (u) return u.slice(0, 255)
  if (d) return d.slice(0, 255)
  return `Sezione ${r.numeroSezione}`
}

export function buildSectionImportsForIstat(
  rows: DaitSezioneRow[],
  istatRaw: string,
  theoreticalVoters: number
): DaitSectionImport[] {
  const target = normalizeIstat(istatRaw)
  return rows
    .filter(r => r.istat === target)
    .map(r => ({
      number: r.numeroSezione,
      name: buildSectionName(r),
      location: r.indirizzo ? r.indirizzo.slice(0, 500) : null,
      theoreticalVoters: Math.max(0, theoreticalVoters),
    }))
    .sort((a, b) => a.number - b.number)
}

type DatasetCache = { rows: DaitSezioneRow[]; fetchedAt: number }

let datasetCache: DatasetCache | null = null
/** 6 ore: file grande (~60k righe), non scaricare ad ogni richiesta */
const TTL_MS = 6 * 60 * 60 * 1000

export async function loadDaitSezioniDataset(force: boolean): Promise<DatasetCache> {
  if (!force && datasetCache && Date.now() - datasetCache.fetchedAt < TTL_MS) {
    return datasetCache
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 120_000)
  try {
    const res = await fetch(DAIT_ELENCO_SEZIONI_CSV_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LosPollios/1.0; elezioni comunali open data DAIT)',
        Accept: 'text/csv,text/plain,*/*',
        'Accept-Language': 'it-IT,it;q=0.9',
      },
      cache: 'no-store',
      signal: ctrl.signal,
    })
    if (!res.ok) {
      throw new Error(`DAIT: HTTP ${res.status}`)
    }
    const text = await res.text()
    const rows = parseDaitSezioniCsv(text)
    datasetCache = { rows, fetchedAt: Date.now() }
    return datasetCache
  } finally {
    clearTimeout(timer)
  }
}
