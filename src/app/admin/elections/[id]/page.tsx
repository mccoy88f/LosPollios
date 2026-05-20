import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import DeleteElectionButton from './DeleteElectionButton'
import ElectionDetailInfoCard from './ElectionDetailInfoCard'
import { AdminNavCard } from '@/components/ui/AdminNavCard'
import { Alert } from '@/components/ui/Alert'
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

  const navItems = [
    { href: `/admin/elections/${id}/sections`, icon: Landmark, title: 'Sezioni', description: `${election._count.sections} sezioni configurate` },
    { href: `/admin/elections/${id}/lists`, icon: ClipboardList, title: 'Liste & Candidati', description: `${election._count.lists} liste configurate` },
    { href: `/admin/elections/${id}/users`, icon: Users, title: 'Accessi', description: `${election._count.users} utenti configurati` },
    { href: `/live/${id}`, icon: BarChart3, title: 'Dashboard Live', description: 'Segui lo spoglio in diretta', external: true },
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

      <div className="mt-10">
        <Alert variant="error" title="Zona pericolosa">
          <p className="mb-3 max-w-2xl">
            L&apos;eliminazione è irreversibile. Puoi eliminare un&apos;elezione in qualsiasi stato; i dati collegati
            vengono rimossi dal database.
          </p>
          <DeleteElectionButton electionId={election.id} electionName={election.name} />
        </Alert>
      </div>
    </div>
  )
}
