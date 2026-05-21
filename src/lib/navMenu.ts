import type { JwtPayload } from '@/lib/auth'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  ClipboardList,
  Database,
  Home,
  Radio,
  Settings,
  Shield,
  User,
  Users,
  History,
} from 'lucide-react'

export type NavMenuItem = {
  label: string
  href: string
  icon: LucideIcon
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
      items: [{ label: 'Home', href: '/', icon: Home }],
    },
  ]

  if (election) {
    const id = election.electionId
    sections.push({
      title: election.electionName,
      items: [
        { label: 'Live', href: `/live/${id}`, icon: Radio },
        { label: 'Aggiornamenti', href: `/live/${id}/aggiornamenti`, icon: History },
        { label: 'Analisi', href: `/dashboard/${id}`, icon: BarChart3 },
        { label: 'Preferenze', href: `/live/${id}/preferenze`, icon: Users },
      ],
    })
  }

  if (session.role === 'entry' && session.electionId) {
    const entryId = session.electionId
    const hasElectionBlock = election?.electionId === entryId
    if (!hasElectionBlock) {
      sections.push({
        title: 'Inserimento',
        items: [{ label: 'Sezioni', href: `/entry/${entryId}`, icon: ClipboardList }],
      })
    } else {
      const block = sections.find(s => s.title === election!.electionName)
      if (block) {
        block.items.push({ label: 'Inserimento sezioni', href: `/entry/${entryId}`, icon: ClipboardList })
      }
    }
  }

  if (session.role === 'admin') {
    sections.push({
      title: 'Amministrazione',
      items: [
        { label: 'Elezioni', href: '/admin', icon: Settings },
        { label: 'Accessi utenti', href: '/admin/users', icon: Shield },
        { label: 'Anagrafica', href: '/admin/persons', icon: User },
        { label: 'Dati storici', href: '/admin/historical', icon: Database },
      ],
    })
  }

  return sections
}
