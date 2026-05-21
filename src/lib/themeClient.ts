'use client'

import { resolveIsDark, UI_THEME_COOKIE, type ThemePreference } from '@/lib/theme'

export function applyThemePreference(preference: ThemePreference) {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = resolveIsDark(preference, systemDark)
  document.documentElement.classList.toggle('dark', dark)
}

export function persistThemeCookie(preference: ThemePreference) {
  document.cookie = `${UI_THEME_COOKIE}=${preference};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
}
