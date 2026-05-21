import { AppHeader } from '@/components/nav/AppHeader'
import { ContextBar } from '@/components/nav/ContextBar'

export type NavCrumb = { label: string; href?: string }

type NavLink = { label: string; href: string }

type Props = {
  crumbs?: NavCrumb[]
  primaryLinks?: NavLink[]
  contextLinks?: NavLink[]
  username?: string | null
  displayName?: string | null
  maxWidthClass?: string
  /** Contenuto sotto il breadcrumb (es. tab sezioni entry) */
  contextBarChildren?: React.ReactNode
}

export function SiteTopNav({
  crumbs = [],
  primaryLinks,
  contextLinks,
  username,
  displayName,
  maxWidthClass = 'max-w-7xl',
  contextBarChildren,
}: Props) {
  return (
    <>
      <AppHeader
        primaryLinks={primaryLinks}
        contextLinks={contextLinks}
        username={username}
        displayName={displayName}
        maxWidthClass={maxWidthClass}
      />
      <ContextBar crumbs={crumbs} maxWidthClass={maxWidthClass}>
        {contextBarChildren}
      </ContextBar>
    </>
  )
}
