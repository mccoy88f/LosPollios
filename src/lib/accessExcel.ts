import * as XLSX from 'xlsx'

export const ACCESS_SHEET_NAME = 'Accessi'

export const ACCESS_TEMPLATE_HEADERS = [
  'Username',
  'Password',
  'Nome (opz.)',
  'Ruolo',
  'Nome lista (opz.)',
  'Sezioni (opz.)',
  'Attivo (opz.)',
] as const

/** Colonna extra solo per import globale da /admin/users */
export const ACCESS_ELECTION_HEADER = 'Elezione (opz.)'

export type AccessParsedRow = {
  username: string
  password: string
  name: string | null
  role: string
  listName: string | null
  /** Numeri di sezione elettorale; vuoto = tutte */
  sectionNumbers: number[]
  active: boolean
  /** Nome elezione (solo import globale) */
  electionLabel: string | null
}

function cellStr(v: unknown): string {
  if (v == null || v === '') return ''
  if (typeof v === 'number') return String(v)
  return String(v).trim()
}

function parseBool(v: unknown, defaultVal = true): boolean {
  const s = cellStr(v).toLowerCase()
  if (!s) return defaultVal
  if (['sì', 'si', 's', 'yes', 'y', '1', 'true', 'vero', 'attivo'].includes(s)) return true
  if (['no', 'n', '0', 'false', 'falso', 'off', 'inattivo'].includes(s)) return false
  return defaultVal
}

/** Accetta etichette italiane o codici API */
export function parseAccessRole(v: unknown): string | null {
  const s = cellStr(v).toLowerCase()
  if (!s) return null
  if (s === 'entry' || s.includes('inserimento') || s === 'operatore' || s === 'operatore dati') {
    return 'entry'
  }
  if (s === 'viewer' || s.includes('visualizz') || s === 'osservatore' || s === 'sola lettura') {
    return 'viewer'
  }
  if (s === 'admin' || s.includes('amministr')) return 'admin'
  return null
}

function parseSectionNumbers(v: unknown): number[] {
  const s = cellStr(v)
  if (!s || s === '*' || s.toLowerCase() === 'tutte') return []
  return s
    .split(/[,;|\s]+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => parseInt(p, 10))
    .filter(n => !Number.isNaN(n) && n > 0)
}

function rowLooksLikeHeader(cells: string[]): boolean {
  const joined = cells.join(' ').toLowerCase()
  return joined.includes('username') && (joined.includes('password') || joined.includes('ruolo'))
}

export function downloadAccessExcelTemplate(opts?: {
  filename?: string
  includeElectionColumn?: boolean
  /** Righe demo aggiuntive dopo l'intestazione */
  demoRows?: (string | number)[][]
  listNames?: string[]
}): void {
  const includeElection = opts?.includeElectionColumn ?? false
  const headers = includeElection
    ? [...ACCESS_TEMPLATE_HEADERS, ACCESS_ELECTION_HEADER]
    : [...ACCESS_TEMPLATE_HEADERS]

  const defaultDemo: (string | number)[][] = [
    ['rep.lista1', 'CambiaSubito1!', 'Mario Rossi', 'Inserimento dati', 'Lista Civica Esempio', '1,2,3', 'sì'],
    ['rep.lista2', 'CambiaSubito2!', 'Laura Bianchi', 'Inserimento dati', 'Lista Demo', '', 'sì'],
    ['osservatore', 'SoloLettura1', 'Osservatore generale', 'Solo visualizzazione', '', '', 'sì'],
  ]

  if (opts?.listNames?.length) {
    defaultDemo.length = 0
    opts.listNames.forEach((name, i) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/gi, '').slice(0, 12) || `lista${i + 1}`
      const row: (string | number)[] = [
        `rep.${slug}`,
        `TempPass${i + 1}!`,
        `Rappresentante ${name}`,
        'Inserimento dati',
        name,
        '',
        'sì',
      ]
      if (includeElection) row.push('')
      defaultDemo.push(row)
    })
  }

  const data: (string | number)[][] = [headers, ...(opts?.demoRows ?? defaultDemo)]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  const colWidths = includeElection
    ? [{ wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 10 }, { wch: 28 }]
    : [{ wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 10 }]
  ws['!cols'] = colWidths
  XLSX.utils.book_append_sheet(wb, ws, ACCESS_SHEET_NAME)

  const note = XLSX.utils.aoa_to_sheet([
    ['Istruzioni import accessi'],
    ['Compila il foglio «Accessi» e importalo dalla pagina Gestione accessi.'],
    ['Username: univoco nel sistema. Password: in chiaro nel file (verrà crittografata al salvataggio).'],
    ['Ruolo: «Inserimento dati», «Solo visualizzazione» oppure «Amministratore».'],
    ['Nome lista: opzionale; limita l’operatore a quella lista (rappresentante di lista).'],
    ['Sezioni: numeri separati da virgola (es. 1,3,5). Vuoto = tutte le sezioni dell’elezione.'],
    ['Attivo: sì/no (default sì).'],
    ...(includeElection
      ? [['Elezione: nome dell’elezione (obbligatorio per utenti non admin in import globale).']]
      : [['In import da scheda elezione la colonna Elezione non serve.']]),
    ['Dopo l’import chiedi agli operatori di cambiare la password al primo accesso.'],
  ])
  note['!cols'] = [{ wch: 78 }]
  XLSX.utils.book_append_sheet(wb, note, 'Istruzioni')

  XLSX.writeFile(wb, opts?.filename ?? 'lospollios-modello-accessi.xlsx')
}

export function parseAccessExcel(buffer: ArrayBuffer, opts?: { includeElectionColumn?: boolean }): {
  rows: AccessParsedRow[]
  errors: string[]
} {
  const includeElection = opts?.includeElectionColumn ?? false
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheetName = wb.SheetNames.find(n => n === ACCESS_SHEET_NAME) ?? wb.SheetNames[0]
  if (!sheetName) return { rows: [], errors: ['File Excel vuoto o senza fogli.'] }

  const sheet = wb.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][]

  const errors: string[] = []
  const out: AccessParsedRow[] = []
  let start = 0
  if (rawRows.length > 0) {
    const first = (rawRows[0] as unknown[]).map(c => cellStr(c))
    if (rowLooksLikeHeader(first)) start = 1
  }

  for (let i = start; i < rawRows.length; i++) {
    const r = rawRows[i] as unknown[]
    const line = i + 1
    const username = cellStr(r[0])
    const password = cellStr(r[1])
    if (!username && !password) continue
    if (!username) {
      errors.push(`Riga ${line}: username mancante.`)
      continue
    }
    if (!password) {
      errors.push(`Riga ${line} (${username}): password mancante.`)
      continue
    }

    const role = parseAccessRole(r[3])
    if (!role) {
      errors.push(`Riga ${line} (${username}): ruolo non valido («${cellStr(r[3])}»).`)
      continue
    }

    const electionLabel = includeElection ? cellStr(r[7]) || null : null
    if (includeElection && role !== 'admin' && !electionLabel) {
      errors.push(`Riga ${line} (${username}): indicare l’elezione per utenti non admin.`)
      continue
    }

    out.push({
      username,
      password,
      name: cellStr(r[2]) || null,
      role,
      listName: cellStr(r[4]) || null,
      sectionNumbers: parseSectionNumbers(r[5]),
      active: parseBool(r[6], true),
      electionLabel,
    })
  }

  return { rows: out, errors }
}
