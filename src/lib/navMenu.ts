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
  title?: string
  items: NavMenuItem[]
}

export type ElectionNavContext = {
  electionId: number
  electionName: string
}

/** Voci del menu laterale (app + elezione + admin). */
export function buildAppMenuSections(
  session: JwtPayload | null | undefined,
  election?: ElectionNavContext | null
): NavMenuSection[] {
  if (!session) return []

  const sections: NavMenuSection[] = [
    {
      items: [{ label: 'Home', href: '/', icon: 'home' }],
    },
  ]

  if (election) {
    const id = election.electionId
    sections.push({
      title: election.electionName,
      items: [
        { label: 'Live', href: `/live/${id}`, icon: 'radio' },
        { label: 'Aggiornamenti', href: `/live/${id}/aggiornamenti`, icon: 'history' },
        { label: 'Preferenze', href: `/live/${id}/preferenze`, icon: 'users' },
      ],
    })
  }

  if (session.role === 'entry' && session.electionId) {
    const entryId = session.electionId
    const hasElectionBlock = election?.electionId === entryId
    if (!hasElectionBlock) {
      sections.push({
        title: 'Inserimento',
        items: [{ label: 'Sezioni', href: `/entry/${entryId}`, icon: 'clipboardList' }],
      })
    } else {
      const block = sections.find(s => s.title === election!.electionName)
      if (block) {
        block.items.push({
          label: 'Inserimento sezioni',
          href: `/entry/${entryId}`,
          icon: 'clipboardList',
        })
      }
    }
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
