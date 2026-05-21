export type ThemePreference = 'light' | 'dark' | 'system'

export const UI_THEME_COOKIE = 'ui-theme'

export function isThemePreference(value: string): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function resolveIsDark(preference: ThemePreference, systemPrefersDark: boolean): boolean {
  if (preference === 'dark') return true
  if (preference === 'light') return false
  return systemPrefersDark
}

export function setThemeCookie(preference: ThemePreference) {
  return {
    name: UI_THEME_COOKIE,
    value: preference,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax' as const,
  }
}
