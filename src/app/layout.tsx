import type { Metadata, Viewport } from 'next'
import { cookies, headers } from 'next/headers'
import './globals.css'
import { AppBootSplash } from '@/components/AppBootSplash'
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
  title: 'LosPollios',
  description: 'Gestione spoglio elezioni comunali in tempo reale',
  applicationName: 'LosPollios',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
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
  const pathname = (await headers()).get('x-pathname') ?? ''
  const isPublicBoard = pathname.startsWith('/public/')

  return (
    <html lang="it" suppressHydrationWarning className={isPublicBoard ? 'h-full overflow-hidden' : undefined}>
      <head>
        <ThemeScript />
      </head>
      <body className={isPublicBoard ? 'h-full overflow-hidden' : undefined}>
        <ThemeProvider preference={preference}>
          <div
            className={
              isPublicBoard ? 'h-dvh w-full overflow-hidden flex flex-col' : 'min-h-dvh flex flex-col'
            }
          >
            {!isPublicBoard && <AppBootSplash />}
            <PwaRegister />
            <div className={isPublicBoard ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1 flex flex-col min-h-0'}>
              {children}
            </div>
            {!isPublicBoard && <SiteFooter />}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
