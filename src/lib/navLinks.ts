import type { JwtPayload } from '@/lib/auth'

export type NavLink = { label: string; href: string }

/** Link funzioni principali nella barra blu (per ruolo). */
export function getPrimaryNavLinks(session: JwtPayload | null | undefined): NavLink[] {
  if (!session) return []

  const links: NavLink[] = [{ label: 'Home', href: '/' }]

  if (session.role === 'admin') {
    links.push(
      { label: 'Elezioni', href: '/admin' },
      { label: 'Accessi', href: '/admin/users' },
      { label: 'Anagrafica', href: '/admin/persons' },
      { label: 'Dati storici', href: '/admin/historical' }
    )
  }

  if (session.role === 'entry' && session.electionId) {
    links.push({ label: 'Inserimento', href: `/entry/${session.electionId}` })
  }

  return links
}
