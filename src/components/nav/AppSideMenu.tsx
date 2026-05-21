'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import {
  BarChart3,
  ClipboardList,
  Database,
  Home,
  LogOut,
  Radio,
  Settings,
  Shield,
  User,
  Users,
  History,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { NavMenuIconId, NavMenuSection } from '@/lib/navMenu'

const MENU_ICONS: Record<NavMenuIconId, LucideIcon> = {
  home: Home,
  radio: Radio,
  history: History,
  barChart3: BarChart3,
  users: Users,
  clipboardList: ClipboardList,
  settings: Settings,
  shield: Shield,
  user: User,
  database: Database,
}

export function AppSideMenu({
  open,
  onClose,
  sections,
}: {
  open: boolean
  onClose: () => void
  sections: NavMenuSection[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  function isActive(href: string) {
    const qIdx = href.indexOf('?')
    const path = qIdx >= 0 ? href.slice(0, qIdx) : href
    const hrefParams = qIdx >= 0 ? new URLSearchParams(href.slice(qIdx + 1)) : null
    const hrefView = hrefParams?.get('view')

    if (hrefView) {
      return pathname === path && searchParams.get('view') === hrefView
    }

    if (path === '/') return pathname === '/'

    // Live base: attiva solo panoramica (nessun ?view o view=panorama)
    if (/^\/live\/\d+$/.test(path)) {
      if (pathname !== path) return false
      const currentView = searchParams.get('view')
      return !currentView || currentView === 'panorama'
    }

    if (pathname === path) return true
    if (/^\/entry\/\d+$/.test(path)) return pathname === path
    return pathname.startsWith(`${path}/`) || pathname === path
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Chiudi menu"
        onClick={onClose}
      />
      <aside
        className={cn(
          'absolute left-0 top-0 bottom-0 w-[min(18.5rem,88vw)]',
          'bg-white dark:bg-slate-900 shadow-2xl flex flex-col',
          'animate-slideIn'
        )}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <span className="font-semibold text-gray-900 dark:text-slate-100">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-5">
          {sections.map((section, si) => (
            <div key={si}>
              {section.title && (
                <p className="px-2 mb-1 text-xs font-bold text-brand-900 truncate" title={section.title}>
                  {section.title}
                </p>
              )}
              <ul
                className={cn(
                  'space-y-0.5',
                  section.title && 'ml-2 pl-2 border-l-2 border-brand-100'
                )}
              >
                {section.items.map(item => {
                  const Icon = MENU_ICONS[item.icon]
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          active
                            ? 'bg-brand-800 text-white'
                            : 'text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                        )}
                      >
                        <Icon className="w-5 h-5 shrink-0 opacity-90" aria-hidden />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-gray-200 dark:border-slate-700 p-3 space-y-0.5">
          <Link
            href="/account"
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === '/account'
                ? 'bg-brand-800 text-white'
                : 'text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
            )}
          >
            Il mio account
          </Link>
          <button
            type="button"
            onClick={async () => {
              onClose()
              await fetch('/api/auth/logout', { method: 'POST' })
              window.location.href = '/login'
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <LogOut className="w-5 h-5 shrink-0" aria-hidden />
            Esci
          </button>
        </div>
      </aside>
    </div>
  )
}
