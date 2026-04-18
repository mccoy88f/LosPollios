import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import ElectionStatusForm from './ElectionStatusForm'

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
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm">← Elezioni</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{election.name}</h1>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">{election.name}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{election.commune} · {formatDate(election.date)}</p>
          </div>
          <ElectionStatusForm electionId={election.id} currentStatus={election.status} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          {[
            ['Sezioni', `${sectionsCounted} / ${election._count.sections}`],
            ['Votanti teorici', totalVoters.toLocaleString('it-IT')],
            ['Votanti reali', actualVoters.toLocaleString('it-IT')],
            ['Liste', election._count.lists],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  )
}
