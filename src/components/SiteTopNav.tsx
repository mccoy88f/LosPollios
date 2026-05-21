import { SiteHeader } from '@/components/nav/SiteHeader'
import { cn } from '@/lib/cn'
import type { ElectionNavContext, NavMenuSection } from '@/lib/navMenu'

export type NavCrumb = { label: string; href?: string }

type Props = {
  menuSections: NavMenuSection[]
  election?: ElectionNavContext | null
  username: string
  displayName?: string | null
  maxWidthClass?: string
  /** Contenuto sotto l'header (es. tab sezioni entry) */
  subHeader?: React.ReactNode
  /** Alias per subHeader (entry tabs) */
  contextBarChildren?: React.ReactNode
}

export function SiteTopNav({
  menuSections,
  election = null,
  username,
  displayName,
  maxWidthClass = 'max-w-7xl',
  subHeader,
  contextBarChildren,
}: Props) {
  const below = subHeader ?? contextBarChildren

  return (
    <>
      <SiteHeader
        menuSections={menuSections}
        election={election}
        username={username}
        displayName={displayName}
        maxWidthClass={maxWidthClass}
      />
      {below ? (
        <div className="shrink-0 bg-white border-b border-gray-200">
          <div className={cn(maxWidthClass, 'mx-auto px-4 py-2')}>{below}</div>
        </div>
      ) : null}
    </>
  )
}
