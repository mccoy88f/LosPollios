import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LosPollios – Spoglio Elezioni',
  description: 'Gestione spoglio elezioni comunali in tempo reale',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
