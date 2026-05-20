'use client'

import { LogOut } from 'lucide-react'

export function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        window.location.href = '/login'
      }}
      className={
        className ??
        'inline-flex items-center gap-1.5 text-brand-200 hover:text-white text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded px-1'
      }
    >
      <LogOut className="w-4 h-4" aria-hidden />
      Esci
    </button>
  )
}
