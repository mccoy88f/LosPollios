import type { JwtPayload } from '@/lib/auth'
import { electionHasCoalitions } from '@/lib/liveElection'

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
  | 'activity'
  | 'list'
  | 'grid'
  | 'pieChart'

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
  /** Almeno una lista con coalizione compilata (tab/menu Coalizioni) */
  hasCoalitions?: boolean
}

function electionSubItems(electionId: number, hasCoalitions = false): NavMenuItem[] {
  const id = electionId
  const items: NavMenuItem[] = [
    { label: 'Panoramica', href: `/live/${id}`, icon: 'radio' },
    { label: 'Liste', href: `/live/${id}?view=liste`, icon: 'list' },
    { label: 'Sezioni', href: `/live/${id}?view=sezioni`, icon: 'grid' },
  ]
  if (hasCoalitions) {
    items.push({ label: 'Coalizioni', href: `/live/${id}?view=coalizioni`, icon: 'pieChart' })
  }
  items.push(
    { label: 'Preferenze', href: `/live/${id}?view=preferenze`, icon: 'users' },
    { label: 'Analisi', href: `/live/${id}?view=analisi`, icon: 'barChart3' },
    { label: 'Aggiornamenti', href: `/live/${id}?view=aggiornamenti`, icon: 'history' }
  )
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

  /** Inserimento: utenti entry sulla propria elezione; admin con contesto elezione (live, entry, scheda elezione). */
  const entryHrefElectionId =
    session.role === 'entry' && session.electionId
      ? session.electionId
      : session.role === 'admin' && electionId
        ? electionId
        : null

  if (entryHrefElectionId) {
    sections.push({
      items: [
        {
          label: 'Inserimento dati',
          href: `/entry/${entryHrefElectionId}`,
          icon: 'clipboardList',
        },
      ],
    })
  }
  const electionName = election?.electionName

  if (electionId && electionName) {
    sections.push({
      title: electionName,
      items: electionSubItems(electionId, election?.hasCoalitions ?? false),
    })
  }

  if (session.role === 'admin') {
    sections.push({
      title: 'Amministrazione',
      items: [
        { label: 'Elezioni', href: '/admin', icon: 'settings' },
        { label: 'Accessi utenti', href: '/admin/users', icon: 'shield' },
        { label: 'Sessioni attive', href: '/admin/sessions', icon: 'activity' },
        { label: 'Anagrafica', href: '/admin/persons', icon: 'user' },
        { label: 'Dati storici', href: '/admin/historical', icon: 'database' },
      ],
    })
  }

  return sections
}
