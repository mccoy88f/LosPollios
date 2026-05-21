import Link from 'next/link'
import { AppLogo } from '@/components/AppLogo'
import { UserMenu } from '@/components/nav/UserMenu'
import type { NavLink } from '@/lib/navLinks'

type Props = {
  primaryLinks?: NavLink[]
  contextLinks?: NavLink[]
  username?: string | null
  displayName?: string | null
  maxWidthClass?: string
}

export function AppHeader({
  primaryLinks,
  contextLinks,
  username,
  displayName,
  maxWidthClass = 'max-w-7xl',
}: Props) {
  return (
    <header className="bg-brand-800 text-white shadow shrink-0">
      <div
        className={`${maxWidthClass} mx-auto px-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 min-h-14 py-2`}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
          <Link
            href="/"
            className="font-bold text-lg flex items-center gap-2 shrink-0 hover:text-brand-100 transition-colors"
          >
            <AppLogo size={20} className="text-white shrink-0" />
            <span>LosPollios</span>
          </Link>

          {primaryLinks && primaryLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-0.5 text-sm border-l border-white/20 pl-3">
              {primaryLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/85 hover:text-white px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {contextLinks && contextLinks.length > 0 && (
            <div className="flex items-center gap-1 text-sm">
              {contextLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/90 hover:text-white px-2.5 py-1 rounded-md border border-accent-500/60 hover:border-accent-400 hover:bg-accent-500/15 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
          {username ? <UserMenu username={username} displayName={displayName} /> : null}
        </div>
      </div>
    </header>
  )
}
