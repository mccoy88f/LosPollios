'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LogOut, User } from 'lucide-react'
import { cn } from '@/lib/cn'

export function UserMenu({ username, displayName }: { username: string; displayName?: string | null }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const initial = (displayName || username).trim().charAt(0).toUpperCase() || '?'

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-full',
          'bg-brand-700 border-2 border-accent-500 text-white font-semibold text-sm',
          'hover:bg-brand-800 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400'
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menu utente ${username}`}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-50 text-gray-900"
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold truncate">{displayName || username}</p>
            <p className="text-xs text-gray-500 truncate">@{username}</p>
          </div>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <User className="w-4 h-4 text-gray-500" aria-hidden />
            Il mio account
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false)
              await fetch('/api/auth/logout', { method: 'POST' })
              window.location.href = '/login'
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" aria-hidden />
            Esci
          </button>
        </div>
      )}
    </div>
  )
}
