'use client'

import Link from 'next/link'
import { LogoutButton } from '@/components/LogoutButton'

export type NavCrumb = { label: string; href?: string }

type NavLink = { label: string; href: string }

type Props = {
  crumbs?: NavCrumb[]
  /** Link principali (es. Elezioni, Dati storici) */
  primaryLinks?: NavLink[]
  /** Link contestuali a destra (es. Live ↔ Analisi) */
  contextLinks?: NavLink[]
  username?: string | null
  showLogout?: boolean
  maxWidthClass?: string
}

export function SiteTopNav({
  crumbs = [],
  primaryLinks,
  contextLinks,
  username,
  showLogout,
  maxWidthClass = 'max-w-7xl',
}: Props) {
  return (
    <nav className="bg-blue-800 text-white shadow">
      <div className={`${maxWidthClass} mx-auto px-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 min-h-14 py-2`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
          <Link href="/" className="font-bold text-lg flex items-center gap-2 shrink-0 hover:text-blue-100 transition-colors">
            <span aria-hidden>🗳️</span>
            <span>LosPollios</span>
          </Link>

          {primaryLinks && primaryLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-sm border-l border-blue-600 pl-4">
              {primaryLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-blue-200 hover:text-white px-2 py-1 rounded-md hover:bg-blue-700/50 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {crumbs.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-blue-100 min-w-0">
              {crumbs.map((c, i) => (
                <span key={`${c.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
                  {i > 0 && <span className="text-blue-500 select-none" aria-hidden>/</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-white text-blue-200 truncate max-w-[12rem] sm:max-w-xs">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-white font-medium truncate max-w-[14rem] sm:max-w-md">{c.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {contextLinks && contextLinks.length > 0 && (
            <div className="flex items-center gap-1 text-sm">
              {contextLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-blue-200 hover:text-white px-2 py-1 rounded-md border border-blue-600 hover:border-blue-400 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
          {username ? <span className="text-blue-200 text-sm hidden sm:inline max-w-[10rem] truncate">{username}</span> : null}
          {showLogout ? <LogoutButton /> : null}
        </div>
      </div>
    </nav>
  )
}
