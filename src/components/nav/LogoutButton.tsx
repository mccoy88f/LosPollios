'use client'

import { LogOut } from 'lucide-react'
import { cn } from '@/lib/cn'

export function LogoutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        window.location.href = '/login'
      }}
      className={cn(
        'w-full flex items-center justify-center gap-2 h-11 px-5 text-sm font-medium rounded-lg',
        'border border-red-200 bg-white text-red-700 hover:bg-red-50 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
        className
      )}
    >
      <LogOut className="w-5 h-5 shrink-0" aria-hidden />
      Esci
    </button>
  )
}
