import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import DeleteElectionButton from './DeleteElectionButton'
import ClearElectionEntryDataButton from './ClearElectionEntryDataButton'
import ElectionBackupPanel from './ElectionBackupPanel'
import { getElectionEntryDataCounts } from '@/lib/clearElectionEntryData'
import ElectionDetailInfoCard from './ElectionDetailInfoCard'
import { AdminNavCard } from '@/components/ui/AdminNavCard'
import { BarChart3, ClipboardList, ClipboardPen, Landmark, LineChart, Users } from 'lucide-react'

type Props = { params: Promise<{ id: string }> }

export default async function ElectionDetailPage({ params }: Props) {
  const { id } = await params
  const election = await prisma.election.findUnique({
    where: { id: Number(id) },
    include: { _count: { select: { sections: true, lists: true, users: true } } },
  })
  if (!election) notFound()

  const sections = await prisma.section.findMany({ where: { electionId: election.id } })
  const turnouts = await prisma.sectionTurnout.findMany({ where: { electionId: election.id } })

  const totalVoters  = sections.reduce((s, sec) => s + sec.theoreticalVoters, 0)
  const actualVoters = turnouts.reduce((s, t) => s + t.votersActual, 0)
  const sectionsCounted = new Set(turnouts.map(t => t.sectionId)).size
  const entryDataCounts = await getElectionEntryDataCounts(election.id)

  const navItems = [
    { href: `/admin/elections/${id}/sections`, icon: Landmark, title: 'Sezioni', description: `${election._count.sections} sezioni configurate` },
    { href: `/admin/elections/${id}/lists`, icon: ClipboardList, title: 'Liste & Candidati', description: `${election._count.lists} liste configurate` },
    { href: `/admin/elections/${id}/users`, icon: Users, title: 'Accessi', description: `${election._count.users} utenti configurati` },
    { href: `/live/${id}`, icon: BarChart3, title: 'Panoramica live', description: 'Segui lo spoglio in diretta', external: true },
    { href: `/entry/${id}`, icon: ClipboardPen, title: 'Inserimento dati', description: 'Inserisci i voti per sezione', external: true },
    { href: `/dashboard/${id}`, icon: LineChart, title: 'Analisi & Proiezioni', description: 'Confronti storici e seggi', external: true },
  ]

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link href="/admin" className="text-brand-600 hover:underline">
          Elezioni
        </Link>
        <span className="text-gray-300" aria-hidden>/</span>
        <span className="text-gray-900 font-medium">{election.name}</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{election.name}</h1>

      <ElectionDetailInfoCard
        electionId={election.id}
        name={election.name}
        commune={election.commune}
        dateLabel={formatDate(election.date)}
        archivedNotice={election.archived}
        status={election.status}
        archived={election.archived}
        sectionsCounted={sectionsCounted}
        sectionsTotal={election._count.sections}
        totalVoters={totalVoters}
        actualVoters={actualVoters}
        listsCount={election._count.lists}
        eligibleVotersTotal={election.eligibleVotersTotal}
        metadataKey={election.updatedAt.toISOString()}
        metadataInitial={{
          name: election.name,
          commune: election.commune,
          date: election.date,
          type: election.type,
          totalSeats: election.totalSeats,
          threshold: election.threshold,
          notes: election.notes,
          eligibleVotersTotal: election.eligibleVotersTotal,
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {navItems.map(item => (
          <AdminNavCard key={item.href} {...item} />
        ))}
      </div>

      <div className="mt-10 space-y-3 max-w-2xl">
        <details className="rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900/50 group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 font-semibold text-blue-950 dark:text-blue-100 select-none">
            <span>Backup e ripristino</span>
            <span className="text-xs font-normal text-blue-800/80 dark:text-blue-200/80 group-open:hidden">
              espandi
            </span>
          </summary>
          <div className="px-4 pb-4 pt-1 border-t border-blue-200/80 dark:border-blue-900/50">
            <ElectionBackupPanel electionId={election.id} electionName={election.name} />
          </div>
        </details>

        <details className="rounded-xl border border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-900/50 group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 font-semibold text-red-950 dark:text-red-100 select-none">
            <span>Zona pericolosa</span>
            <span className="text-xs font-normal text-red-800/80 dark:text-red-200/80 group-open:hidden">
              espandi
            </span>
          </summary>
          <div className="px-4 pb-4 pt-1 border-t border-red-200/80 dark:border-red-900/50 space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Azzera dati di inserimento</p>
              <p className="text-sm text-gray-700 dark:text-neutral-300 mb-3">
                Rimuove affluenze per sezione, voti di lista e preferenze candidato (tutto ciò che si inserisce da{' '}
                <strong>/entry</strong>). Restano il tetto comunale, i votanti/aventi diritto a livello elezione, le
                sezioni con i loro aventi diritto configurati, liste e candidati.
              </p>
              <ClearElectionEntryDataButton
                electionId={election.id}
                electionName={election.name}
                counts={entryDataCounts}
              />
            </div>
            <div className="border-t border-red-200 dark:border-red-900/50 pt-5">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Elimina elezione</p>
              <p className="text-sm text-gray-700 dark:text-neutral-300 mb-3">
                L&apos;eliminazione è irreversibile. Puoi eliminare un&apos;elezione in qualsiasi stato; i dati collegati
                vengono rimossi dal database.
              </p>
              <DeleteElectionButton electionId={election.id} electionName={election.name} />
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
