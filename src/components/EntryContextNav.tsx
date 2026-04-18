'use client'

import { SiteTopNav, type NavCrumb } from '@/components/SiteTopNav'

type Props = {
  username: string
  electionId: number
  electionName: string
  section?: { number: number; name: string | null }
}

export function EntryContextNav({ username, electionId, electionName, section }: Props) {
  const crumbs: NavCrumb[] = [
    { label: 'Home', href: '/' },
    { label: electionName, href: `/entry/${electionId}` },
  ]
  if (section) {
    crumbs.push({
      label: section.name ? `Sezione ${section.number} · ${section.name}` : `Sezione ${section.number}`,
    })
  }

  return (
    <SiteTopNav
      crumbs={crumbs}
      username={username}
      showLogout
      maxWidthClass="max-w-4xl"
    />
  )
}
