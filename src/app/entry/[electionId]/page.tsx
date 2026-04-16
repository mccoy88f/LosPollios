import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

type Props = { params: Promise<{ electionId: string }> }

export default async function EntryIndexPage({ params }: Props) {
  const { electionId } = await params
  const session = await getSession()
  if (!session || session.role === 'viewer') redirect('/login')

  const election = await prisma.election.findUnique({
    where: { id: Number(electionId) },
  })
  if (!election) notFound()

  const sections = await prisma.section.findMany({
    where: { electionId: election.id },
    orderBy: { number: 'asc' },
    include: {
      turnout: true,
      listResults: true,
    },
  })

  const counted   = sections.filter(s => s.turnout).length
  const completed = sections.filter(s => s.listResults.length > 0).length

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-800 text-white shadow">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/" className="font-bold flex items-center gap-2">🗳️ LosPollios</Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-blue-200">{session.username}</span>
            <form onSubmit={async (e) => { e.preventDefault(); await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login' }}>
              <button className="text-blue-200 hover:text-white">Esci</button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{election.name}</h1>
          <p className="text-gray-500">{election.commune} · {formatDate(election.date)}</p>
          <div className="flex gap-6 mt-3 text-sm">
            <span className="text-gray-600">
              <span className="font-semibold text-blue-600">{counted}</span> / {sections.length} sezioni con affluenza
            </span>
            <span className="text-gray-600">
              <span className="font-semibold text-green-600">{completed}</span> / {sections.length} sezioni con voti
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {sections.map((s) => {
            const hasVotes  = s.listResults.length > 0
            const hasTurnout = !!s.turnout
            const status = hasVotes ? 'complete' : hasTurnout ? 'partial' : 'empty'
            const colors = { complete: 'border-green-300 bg-green-50 text-green-800', partial: 'border-yellow-300 bg-yellow-50 text-yellow-800', empty: 'border-gray-200 bg-white text-gray-700' }

            return (
              <Link
                key={s.id}
                href={`/entry/${electionId}/${s.id}`}
                className={`rounded-xl border-2 p-4 text-center hover:shadow-md transition-all ${colors[status]}`}
              >
                <div className="text-2xl font-bold">{s.number}</div>
                <div className="text-xs mt-1 font-medium">
                  {status === 'complete' ? '✓ Completata' : status === 'partial' ? '◐ Affluenza' : 'Da compilare'}
                </div>
                {s.turnout && (
                  <div className="text-xs mt-1 opacity-70">{s.turnout.votersActual} votanti</div>
                )}
              </Link>
            )
          })}
        </div>

        {sections.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🏛️</p>
            <p>Nessuna sezione configurata per questa elezione.</p>
          </div>
        )}
      </div>
    </div>
  )
}
