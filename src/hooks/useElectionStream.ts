'use client'

import { useEffect, useRef, useState } from 'react'

export type ElectionStreamStatus = 'connecting' | 'live' | 'reconnecting' | 'disconnected'

/** Nessun evento SSE (né ping) oltre questa soglia → connessione considerata persa */
const STALE_MS = 55_000

/**
 * Ascolta `/api/elections/[id]/stream`, aggiorna lo stato connessione e chiama onEvent su dati utili.
 * Non chiude EventSource su error: il browser tenta la riconnessione (anche su mobile dopo sonno/rete).
 */
export function useElectionStream(electionId: number, onEvent: () => void) {
  const [status, setStatus] = useState<ElectionStreamStatus>('connecting')
  const lastActivityRef = useRef(Date.now())
  const onEventRef = useRef(onEvent)
  const esRef = useRef<EventSource | null>(null)
  onEventRef.current = onEvent

  useEffect(() => {
    let watchdog: ReturnType<typeof setInterval> | null = null

    function markActivity() {
      lastActivityRef.current = Date.now()
    }

    function connect() {
      esRef.current?.close()
      setStatus(prev => (prev === 'disconnected' ? 'reconnecting' : 'connecting'))
      const es = new EventSource(`/api/elections/${electionId}/stream`)
      esRef.current = es

      es.onopen = () => {
        markActivity()
        setStatus('live')
      }

      es.onmessage = ev => {
        markActivity()
        setStatus('live')
        const raw = ev.data?.trim() ?? ''
        if (!raw || raw.startsWith(':')) return
        try {
          const parsed = JSON.parse(raw) as { type?: string }
          if (parsed.type === 'ping') return
        } catch {
          /* evento non JSON: ignora */
        }
        onEventRef.current()
      }

      es.onerror = () => {
        markActivity()
        if (es.readyState === EventSource.CLOSED) {
          setStatus('disconnected')
        } else {
          setStatus('reconnecting')
        }
      }
    }

    function reconnectIfNeeded() {
      if (document.visibilityState === 'hidden') return
      const es = esRef.current
      if (!es || es.readyState === EventSource.CLOSED) {
        connect()
        return
      }
      if (Date.now() - lastActivityRef.current > STALE_MS) {
        connect()
      }
    }

    connect()

    watchdog = setInterval(() => {
      if (Date.now() - lastActivityRef.current > STALE_MS) {
        setStatus('disconnected')
      }
    }, 5000)

    window.addEventListener('online', reconnectIfNeeded)
    document.addEventListener('visibilitychange', reconnectIfNeeded)

    return () => {
      if (watchdog) clearInterval(watchdog)
      window.removeEventListener('online', reconnectIfNeeded)
      document.removeEventListener('visibilitychange', reconnectIfNeeded)
      esRef.current?.close()
      esRef.current = null
    }
  }, [electionId])

  return status
}
