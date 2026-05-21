import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import './globals.css'
import { PwaRegister } from '@/components/PwaRegister'
import { ThemeScript } from '@/components/ThemeScript'
import { ThemeProvider } from '@/components/ThemeProvider'
import { SiteFooter } from '@/components/SiteFooter'
import { isThemePreference, UI_THEME_COOKIE, type ThemePreference } from '@/lib/theme'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#063C25',
}

export const metadata: Metadata = {
  title: 'LosPollios – Spoglio Elezioni',
  description: 'Gestione spoglio elezioni comunali in tempo reale',
  applicationName: 'LosPollios',
  appleWebApp: {
    capable: true,
    title: 'LosPollios',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const raw = cookieStore.get(UI_THEME_COOKIE)?.value
  const preference: ThemePreference = raw && isThemePreference(raw) ? raw : 'system'

  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider preference={preference}>
          <div className="min-h-dvh flex flex-col">
            <PwaRegister />
            <div className="flex-1 flex flex-col min-h-0">{children}</div>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
