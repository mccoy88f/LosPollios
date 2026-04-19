import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import DeleteElectionButton from './DeleteElectionButton'
import ElectionDetailInfoCard from './ElectionDetailInfoCard'

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

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800 hover:underline">
          Elezioni
        </Link>
        <span className="text-gray-300" aria-hidden>
          /
        </span>
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

      {/* Management sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: `/admin/elections/${id}/sections`, icon: '🏛️', title: 'Sezioni', desc: `${election._count.sections} sezioni configurate`, color: 'blue' },
          { href: `/admin/elections/${id}/lists`,    icon: '📋', title: 'Liste & Candidati', desc: `${election._count.lists} liste configurate`, color: 'green' },
          { href: `/admin/elections/${id}/users`,    icon: '👥', title: 'Accessi', desc: `${election._count.users} utenti configurati`, color: 'purple' },
          { href: `/live/${id}`,                     icon: '📊', title: 'Dashboard Live', desc: 'Segui lo spoglio in diretta', color: 'orange', external: true },
          { href: `/entry/${id}`,                    icon: '📝', title: 'Inserimento dati', desc: 'Inserisci i voti per sezione', color: 'indigo', external: true },
          { href: `/dashboard/${id}`,                icon: '🔍', title: 'Analisi & Proiezioni', desc: 'Confronti storici e seggi', color: 'red', external: true },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{item.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-red-100 bg-red-50/50 p-5">
        <h2 className="text-sm font-semibold text-red-900 mb-1">Zona pericolosa</h2>
        <p className="text-xs text-red-800/90 mb-3 max-w-2xl">
          L’eliminazione è irreversibile. Puoi eliminare un’elezione in qualsiasi stato (configurazione, attiva o chiusa); i dati
          operativi collegati vengono rimossi dal database.
        </p>
        <DeleteElectionButton electionId={election.id} electionName={election.name} />
      </div>
    </div>
  )
}
