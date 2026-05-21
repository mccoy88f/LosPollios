'use client'

import { useEffect, useState } from 'react'
import { AppLogo } from '@/components/AppLogo'

const STORAGE_KEY = 'lospollios-boot-splash'

/**
 * Splash iniziale (icona + nome) alla prima apertura della sessione browser.
 */
export function AppBootSplash() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* storage non disponibile */
    }

    setShow(true)
    const hide = () => setShow(false)
    const afterLoad = window.setTimeout(hide, 500)
    if (document.readyState === 'complete') return () => window.clearTimeout(afterLoad)
    window.addEventListener('load', hide, { once: true })
    const max = window.setTimeout(hide, 2500)
    return () => {
      window.clearTimeout(afterLoad)
      window.clearTimeout(max)
      window.removeEventListener('load', hide)
    }
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-brand-800 text-white"
      role="status"
      aria-live="polite"
      aria-label="Caricamento LosPollios"
    >
      <AppLogo size={72} className="text-white" />
      <p className="text-2xl sm:text-3xl font-bold tracking-tight">LosPollios</p>
    </div>
  )
}
