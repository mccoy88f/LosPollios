'use client'

import { useEffect, useRef, useState } from 'react'
import { LIVE_REFRESH_MS } from '@/lib/liveRefresh'

export type ElectionStreamStatus = 'connecting' | 'live' | 'reconnecting' | 'disconnected'

/** Nessun evento SSE (né ping) oltre questa soglia → connessione considerata persa */
const STALE_MS = 55_000

/**
 * Ascolta `/api/elections/[id]/stream`, aggiorna lo stato connessione e chiama onEvent su dati utili.
 * Gli eventi utili sono debounced (default 4s) per non intasare la rete.
 */
export function useElectionStream(
  electionId: number,
  onEvent: () => void,
  minRefreshMs: number = LIVE_REFRESH_MS
) {
  const [status, setStatus] = useState<ElectionStreamStatus>('connecting')
  const lastActivityRef = useRef(Date.now())
  const onEventRef = useRef(onEvent)
  const esRef = useRef<EventSource | null>(null)
  const lastRefreshRef = useRef(0)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  onEventRef.current = onEvent

  useEffect(() => {
    let watchdog: ReturnType<typeof setInterval> | null = null

    function markActivity() {
      lastActivityRef.current = Date.now()
    }

    function flushRefresh() {
      lastRefreshRef.current = Date.now()
      onEventRef.current()
    }

    function scheduleRefresh() {
      const now = Date.now()
      const elapsed = now - lastRefreshRef.current
      if (elapsed >= minRefreshMs) {
        flushRefresh()
        return
      }
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null
        flushRefresh()
      }, minRefreshMs - elapsed)
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
        scheduleRefresh()
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
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      window.removeEventListener('online', reconnectIfNeeded)
      document.removeEventListener('visibilitychange', reconnectIfNeeded)
      esRef.current?.close()
      esRef.current = null
    }
  }, [electionId, minRefreshMs])

  return status
}
