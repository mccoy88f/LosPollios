import { load } from 'cheerio'

const ELIGENDO_HOST = 'elezionistorico.interno.gov.it'

export type EligendoParsedRow = {
  listName: string
  candidateMayor: string
  votes: number
  percentage: number
  seats: number | null
  listLogoUrl: string | null
  coalition: null
}

export type EligendoParseResult = {
  sourceUrl: string
  titleRaw: string
  name: string
  commune: string
  year: number
  results: EligendoParsedRow[]
}

export function isAllowedEligendoUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.hostname === ELIGENDO_HOST || u.hostname.endsWith(`.${ELIGENDO_HOST}`)
  } catch {
    return false
  }
}

function absolutize(base: string, src: string | undefined): string | null {
  if (!src?.trim()) return null
  if (src.startsWith('http')) return src
  const u = new URL(base)
  if (src.startsWith('/')) return `${u.origin}${src}`
  return `${u.origin}/${src.replace(/^\//, '')}`
}

/** Voti tipo 3.645 o 11.589 */
export function parseEligendoIntIt(s: string): number {
  const t = s.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '')
  const n = parseInt(t, 10)
  return Number.isNaN(n) ? 0 : n
}

/** Percentuale tipo 41,90 */
export function parseEligendoPercentIt(s: string): number {
  const t = s.replace(/\s/g, '').replace('%', '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(t)
  return Number.isNaN(n) ? 0 : n
}

function parseHeadMeta($: ReturnType<typeof load>): { titleRaw: string; name: string; commune: string; year: number } {
  const titleRaw =
    $('#headEnti h3').first().text().replace(/\s+/g, ' ').trim() ||
    $('.sottotitolo h3, .box-title h3').first().text().replace(/\s+/g, ' ').trim() ||
    $('title').text().trim()

  const dateM = titleRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  const year = dateM ? parseInt(dateM[3], 10) : new Date().getFullYear()
  const name = dateM
    ? `Comunali ${dateM[1]}/${dateM[2]}/${dateM[3]} (import Eligendo)`
    : `Elezione storica (import Eligendo)`

  let commune = 'Comune non rilevato'
  const comuneM = titleRaw.match(/Comune\s+([A-Za-zÀ-ÿ'’\s-]+?)(?:\s*$|\s+Area)/i)
  if (comuneM) {
    commune = `Comune di ${comuneM[1].trim()}`
  }

  return { titleRaw, name, commune, year }
}

/**
 * Parser pagina risultato comunali Eligendo Archivio (tabella .dati.table-striped).
 * @see https://elezionistorico.interno.gov.it/
 */
export function parseEligendoResultsHtml(html: string, pageUrl: string): EligendoParseResult {
  const $ = load(html)
  const meta = parseHeadMeta($)
  const results: EligendoParsedRow[] = []

  const table = $('table.dati.table-striped').first()
  if (!table.length) {
    return { sourceUrl: pageUrl, ...meta, results: [] }
  }

  let pendingMayor = ''

  table.find('tbody tr').each((_, el) => {
    const $row = $(el)
    if ($row.hasClass('totalecomplessivovoti')) return

    if ($row.hasClass('leader')) {
      const mayorCell = $row.find('[id^="candidato"]').first()
      pendingMayor = mayorCell.text().replace(/\s+/g, ' ').trim()
      return
    }

    const listName = $row.find('th.candidato').first().text().replace(/\s+/g, ' ').trim()
    if (!listName) return

    const imgSrc = $row.find('td.simbolo_lista img').attr('src')
    const listLogoUrl = absolutize(pageUrl, imgSrc)

    const voteText = $row.find('td.align_right.vertical_align').first().text()
    const pctText = $row.find('td.percentuale').first().text()
    const votes = parseEligendoIntIt(voteText)
    const percentage = parseEligendoPercentIt(pctText)

    const seggiCell = $row.find('td[headers*="hseggi"]').first()
    let seats: number | null = null
    if (seggiCell.length) {
      const st = seggiCell.text().trim()
      if (st) seats = parseEligendoIntIt(st)
    }

    const mayor = pendingMayor || ''
    pendingMayor = ''

    results.push({
      listName,
      candidateMayor: mayor,
      votes,
      percentage,
      seats,
      listLogoUrl,
      coalition: null,
    })
  })

  return { sourceUrl: pageUrl, ...meta, results }
}

export async function fetchEligendoPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'it-IT,it;q=0.9',
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: impossibile scaricare la pagina Eligendo`)
  }
  return res.text()
}
