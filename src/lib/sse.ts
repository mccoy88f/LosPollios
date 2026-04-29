import { Client } from 'pg'
import prisma from '@/lib/db'

/** Canale NOTIFY condiviso tra istanze Node collegate allo stesso Postgres (multi-replica / load balancer). */
export const SSE_PG_CHANNEL = 'lospollios_election_sse'

/** Limite payload PostgreSQL per NOTIFY (circa 8000 byte). */
const MAX_NOTIFY_PAYLOAD = 7500

type SseNotifyBody = { electionId: number; data: unknown }

export function ssePublish(electionId: number, data: unknown): void {
  if (!process.env.DATABASE_URL) return

  let json: string
  try {
    json = JSON.stringify({ electionId, data } satisfies SseNotifyBody)
  } catch {
    return
  }
  if (json.length > MAX_NOTIFY_PAYLOAD) {
    console.warn('[sse] payload troppo grande per pg_notify, evento ignorato')
    return
  }

  void prisma
    .$executeRawUnsafe('SELECT pg_notify($1, $2)', SSE_PG_CHANNEL, json)
    .catch((e: unknown) => console.error('[sse] pg_notify fallita', e))
}

export type SseSubscription = { close: () => void }

/**
 * Ascolta aggiornamenti per un'elezione tramite LISTEN (connessione dedicata).
 * Chiudere con `close()` alla chiusura dello stream SSE.
 */
export function sseSubscribe(electionId: number, onData: (data: unknown) => void): SseSubscription {
  const url = process.env.DATABASE_URL
  if (!url) {
    return { close: () => {} }
  }

  const client = new Client({ connectionString: url })
  let closed = false

  const close = () => {
    if (closed) return
    closed = true
    client.removeAllListeners('notification')
    void client.end().catch(() => {})
  }

  client.on('notification', msg => {
    if (msg.channel !== SSE_PG_CHANNEL || !msg.payload) return
    try {
      const parsed = JSON.parse(msg.payload) as Partial<SseNotifyBody>
      if (parsed.electionId === electionId && parsed.data !== undefined) {
        onData(parsed.data)
      }
    } catch {
      /* ignore */
    }
  })

  client.on('error', err => {
    console.error('[sse] client PostgreSQL (LISTEN)', err)
    close()
  })

  void client
    .connect()
    .then(() => client.query(`LISTEN ${SSE_PG_CHANNEL}`))
    .catch((err: unknown) => {
      console.error('[sse] LISTEN fallita', err)
      close()
    })

  return { close }
}
