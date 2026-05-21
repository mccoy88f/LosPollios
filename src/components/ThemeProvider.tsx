'use client'

import { useEffect } from 'react'
import { applyThemePreference, persistThemeCookie } from '@/lib/themeClient'
import type { ThemePreference } from '@/lib/theme'

export function ThemeProvider({
  children,
  preference,
}: {
  children: React.ReactNode
  preference: ThemePreference
}) {
  useEffect(() => {
    applyThemePreference(preference)
    persistThemeCookie(preference)

    if (preference !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemePreference('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  return <>{children}</>
}
