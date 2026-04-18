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
