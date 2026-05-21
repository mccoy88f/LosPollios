import type { JwtPayload } from '@/lib/auth'

/** Id icona risolvibile lato client (no componenti React da server). */
export type NavMenuIconId =
  | 'home'
  | 'radio'
  | 'history'
  | 'barChart3'
  | 'users'
  | 'clipboardList'
  | 'settings'
  | 'shield'
  | 'user'
  | 'database'

export type NavMenuItem = {
  label: string
  href: string
  icon: NavMenuIconId
}

export type NavMenuSection = {
  /** Voce principale (titolo sezione nel drawer) */
  title?: string
  items: NavMenuItem[]
}

export type ElectionNavContext = {
  electionId: number
  /** Nome elezione (mai il comune) — mostrato in header e come titolo voce menu */
  electionName: string
}

function electionSubItems(electionId: number, session: JwtPayload): NavMenuItem[] {
  const id = electionId
  const items: NavMenuItem[] = [
    { label: 'Live', href: `/live/${id}`, icon: 'radio' },
    { label: 'Aggiornamenti', href: `/live/${id}/aggiornamenti`, icon: 'history' },
    { label: 'Preferenze', href: `/live/${id}/preferenze`, icon: 'users' },
    { label: 'Analisi', href: `/live/${id}?view=analisi`, icon: 'barChart3' },
  ]
  if (session.role === 'entry' || session.role === 'admin') {
    items.push({ label: 'Inserimento sezioni', href: `/entry/${id}`, icon: 'clipboardList' })
  }
  return items
}

/**
 * Menu laterale: stessa struttura per admin e rappresentanti di lista.
 * Voce = elezione o «Amministrazione»; sottovoci = azioni.
 */
export function buildAppMenuSections(
  session: JwtPayload | null | undefined,
  election?: ElectionNavContext | null
): NavMenuSection[] {
  if (!session) return []

  const sections: NavMenuSection[] = [
    { items: [{ label: 'Home', href: '/', icon: 'home' }] },
  ]

  const electionId = election?.electionId ?? (session.role === 'entry' ? session.electionId : null)
  const electionName = election?.electionName

  if (electionId && electionName) {
    sections.push({
      title: electionName,
      items: electionSubItems(electionId, session),
    })
  }

  if (session.role === 'admin') {
    sections.push({
      title: 'Amministrazione',
      items: [
        { label: 'Elezioni', href: '/admin', icon: 'settings' },
        { label: 'Accessi utenti', href: '/admin/users', icon: 'shield' },
        { label: 'Anagrafica', href: '/admin/persons', icon: 'user' },
        { label: 'Dati storici', href: '/admin/historical', icon: 'database' },
      ],
    })
  }

  return sections
}
