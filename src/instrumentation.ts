/**
 * Eseguito all’avvio del server Node (Next.js instrumentation).
 * SQLite: abilita WAL per migliorare letture concorrenti durante le scritture (tipico carico spoglio).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const url = process.env.DATABASE_URL ?? ''
  if (!url.startsWith('file:') && !url.includes('sqlite')) return

  try {
    const { default: prisma } = await import('@/lib/db')
    // PRAGMA in SQLite spesso restituiscono righe: $executeRaw fallisce con "Execute returned results"
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;')
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;')
  } catch (e) {
    console.error('[instrumentation] Impostazione PRAGMA SQLite non riuscita:', e)
  }
}
