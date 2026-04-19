'use client'

import { useEffect } from 'react'

/**
 * Registra il service worker per i criteri di installazione PWA (Chrome/Android)
 * e migliora il comportamento offline leggero.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
      } catch {
        // localhost http ok; in produzione serve HTTPS
      }
    }

    if (document.readyState === 'complete') void register()
    else window.addEventListener('load', () => void register(), { once: true })
  }, [])

  return null
}
