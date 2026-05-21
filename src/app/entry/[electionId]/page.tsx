import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getAllowedSectionIdsForUser } from '@/lib/userAccess'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/ui/Card'
import {
  SectionEntryProgressFill,
  SectionStatusBadge,
  sectionEntryCardClasses,
} from '@/components/ui/SectionStatusBadge'
import { sectionHasEntryData } from '@/lib/sectionStatus'
import { resolveSectionUiStatus } from '@/lib/sectionStatus'
import { countSectionListsFilled, sectionScrutinyPercent } from '@/lib/sectionScrutiny'
import { Building2 } from 'lucide-react'
import { EntryContextNav } from '@/components/EntryContextNav'
import EntrySectionLockToggle from './EntrySectionLockToggle'

type Props = { params: Promise<{ electionId: string }> }

export default async function EntryIndexPage({ params }: Props) {
  const { electionId } = await params
  const session = await getSession()
  if (!session || session.role === 'viewer') redirect('/login')

  const election = await prisma.election.findUnique({
    where: { id: Number(electionId) },
    include: { _count: { select: { lists: true } } },
  })
  if (!election) notFound()
  const totalLists = election._count.lists

  if (session.role === 'entry' && election.archived) {
    redirect('/')
  }

  let allowedSectionIds: number[] | null = null
  if (session.role === 'entry') {
    allowedSectionIds =
      session.allowedSectionIds ?? (await getAllowedSectionIdsForUser(session.userId))
  }

  const sections = await prisma.section.findMany({
    where: {
      electionId: election.id,
      ...(allowedSectionIds?.length ? { id: { in: allowedSectionIds } } : {}),
    },
    orderBy: { number: 'asc' },
    include: {
      turnout: true,
      listResults: { include: { preferences: true } },
    },
  })

  const counted   = sections.filter(s => s.turnout).length
  const completed = sections.filter(s =>
    s.listResults.some(r => r.listVotes > 0 || r.preferences.some(p => p.votes > 0))
  ).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <EntryContextNav electionId={election.id} electionName={election.name} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <PageHeader
          title={election.name}
          description={`${election.commune} · ${formatDate(election.date)} · ${counted}/${sections.length} con affluenza · ${completed}/${sections.length} con voti`}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sections.map((s) => {
            const hasData = sectionHasEntryData(
              s.turnout?.votersActual,
              s.listResults.some(r => r.listVotes > 0)
            )
            const status = resolveSectionUiStatus(s.locked, hasData)
            const listsFilled = countSectionListsFilled(s.listResults)
            const votersActual = s.turnout?.votersActual ?? null
            const progress = {
              sectionNumber: s.number,
              locked: s.locked,
              votersActual,
              listsFilled,
              totalLists,
            }
            const scrutinyPct = sectionScrutinyPercent(s.locked, votersActual, listsFilled, totalLists)

            return (
              <Link
                key={s.id}
                href={`/entry/${electionId}/${s.id}`}
                className={sectionEntryCardClasses(progress)}
                title={`Sezione ${s.number} · spoglio ${scrutinyPct}%${listsFilled > 0 && totalLists > 0 ? ` · ${listsFilled}/${totalLists} liste` : ''}`}
              >
                <SectionEntryProgressFill {...progress} />
                <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="text-2xl font-bold tabular-nums">{s.number}</div>
                <SectionStatusBadge status={status} />
                {session.role === 'admin' && (
                  <EntrySectionLockToggle
                    electionId={election.id}
                    sectionId={s.id}
                    locked={s.locked}
                  />
                )}
                {s.turnout && (
                  <div className="text-xs opacity-80 tabular-nums">{s.turnout.votersActual} votanti</div>
                )}
                </div>
              </Link>
            )
          })}
        </div>

        {sections.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" aria-hidden />
            <p>Nessuna sezione configurata per questa elezione.</p>
          </div>
        )}
      </div>
    </div>
  )
}
