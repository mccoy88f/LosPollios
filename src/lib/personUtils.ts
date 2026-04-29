/** Normalizza per confronti (minuscolo, trim, spazi multipli) */
export function normNamePart(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function namesMatch(a: string, b: string): boolean {
  return normNamePart(a) === normNamePart(b)
}

/** Iniziale maiuscola per ogni parola, resto minuscolo (supporta apostrofi e trattini). */
function capitalizeChunk(chunk: string): string {
  if (!chunk) return chunk
  const lower = chunk.toLocaleLowerCase('it-IT')
  return lower.charAt(0).toLocaleUpperCase('it-IT') + lower.slice(1)
}

export function normalizeNamePartDisplay(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word =>
      word
        .split(/([\-'])/)
        .map(piece => (piece === '-' || piece === "'" ? piece : capitalizeChunk(piece)))
        .join('')
    )
    .join(' ')
}

export function normalizeFullNameLabel(label: string | null | undefined): string | null {
  if (label == null) return null
  const clean = String(label).trim()
  if (!clean) return null
  return clean
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(normalizeNamePartDisplay)
    .join(' ')
}

/**
 * Estrae nome e cognome da una stringa tipo "Mario Rossi" o "Mario De Rossi"
 * (prima parola = nome, resto = cognome)
 */
export function parseFullNameLabel(label: string | null | undefined): { firstName: string; lastName: string } | null {
  if (!label?.trim()) return null
  const parts = label.trim().split(/\s+/)
  if (parts.length < 2) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}
