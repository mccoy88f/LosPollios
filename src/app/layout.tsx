import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PwaRegister } from '@/components/PwaRegister'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#2563eb',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
