export function formatNumber(n: number) {
  return new Intl.NumberFormat('it-IT').format(n)
}

export function formatPercent(n: number, decimals = 1) {
  return `${n.toFixed(decimals)}%`
}

export function formatDate(d: string | Date) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(d)
  )
}

export function formatDateTime(d: string | Date) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

// Palette colori di default per le liste
export const DEFAULT_COLORS = [
  '#2563eb', '#16a34a', '#dc2626', '#ea580c', '#9333ea',
  '#0891b2', '#d97706', '#db2777', '#65a30d', '#0d9488',
]
