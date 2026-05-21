'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, Vote } from 'lucide-react'
import { cn } from '@/lib/cn'
import { AppSideMenu } from '@/components/nav/AppSideMenu'
import type { ElectionNavContext, NavMenuSection } from '@/lib/navMenu'

type Props = {
  menuSections: NavMenuSection[]
  election?: ElectionNavContext | null
  username: string
  displayName?: string | null
  maxWidthClass?: string
}

export function SiteHeader({
  menuSections,
  election,
  username,
  displayName,
  maxWidthClass = 'max-w-7xl',
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const label = (displayName || username).trim()
  const initial = label.charAt(0).toUpperCase() || '?'

  return (
    <>
      <header className="bg-brand-800 text-white shadow shrink-0 sticky top-0 z-40">
        <div
          className={cn(
            maxWidthClass,
            'mx-auto px-3 sm:px-4 flex items-center gap-2 sm:gap-3 min-h-14 py-2'
          )}
        >
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-1 rounded-lg text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 shrink-0"
            aria-label="Apri menu"
          >
            <Menu className="w-6 h-6" aria-hidden />
          </button>

          <Link
            href="/"
            className="font-bold text-base sm:text-lg flex items-center gap-1.5 shrink-0 hover:text-brand-100 transition-colors min-w-0"
          >
            <Vote className="w-5 h-5 shrink-0" aria-hidden />
            <span className="truncate">LosPollios</span>
          </Link>

          {election && (
            <>
              <span className="text-white/40 select-none shrink-0 hidden sm:inline" aria-hidden>
                ·
              </span>
              <Link
                href={`/live/${election.electionId}`}
                className={cn(
                  'min-w-0 max-w-[42vw] sm:max-w-[14rem] md:max-w-md text-sm sm:text-base font-semibold',
                  'text-accent-300 hover:text-accent-200 truncate transition-colors shrink',
                  'focus-visible:outline-none focus-visible:underline'
                )}
                title={election.electionName}
              >
                {election.electionName}
              </Link>
            </>
          )}

          <div className="flex-1 min-w-[0.5rem]" aria-hidden />

          <Link
            href="/account"
            className={cn(
              'flex items-center gap-2 shrink-0 rounded-lg pl-1 pr-2 py-1',
              'hover:bg-white/10 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400'
            )}
            title={label}
          >
            <span
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full',
                'bg-brand-700 border-2 border-accent-500 text-white font-semibold text-sm'
              )}
              aria-hidden
            >
              {initial}
            </span>
            <span className="hidden sm:block text-sm font-medium max-w-[10rem] truncate">{label}</span>
          </Link>
        </div>
      </header>

      <AppSideMenu open={menuOpen} onClose={() => setMenuOpen(false)} sections={menuSections} />
    </>
  )
}
