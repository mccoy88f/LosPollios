import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { LogoutButton } from '@/components/LogoutButton'

export default async function HomePage() {
  const session = await getSession()
  const elections = await prisma.election.findMany({
    where: { status: { not: 'setup' } },
    orderBy: { date: 'desc' },
    take: 10,
  })

  const allElections = await prisma.election.findMany({ orderBy: { date: 'desc' } })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl mb-6">
            <span className="text-4xl">🗳️</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">LosPollios</h1>
          <p className="text-blue-200 text-lg">Gestione spoglio elezioni comunali in tempo reale</p>
        </div>

        {/* Active elections */}
        {elections.length > 0 && (
          <div className="mb-8">
            <h2 className="text-blue-200 text-sm font-semibold uppercase tracking-wider mb-4">
              Elezioni attive
            </h2>
            <div className="grid gap-4">
              {elections.map((e) => (
                <div key={e.id} className="bg-white/10 backdrop-blur rounded-xl p-5 flex items-center justify-between hover:bg-white/15 transition-colors">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{e.name}</h3>
                    <p className="text-blue-200 text-sm">{e.commune} · {formatDate(e.date)}</p>
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href={`/live/${e.id}`}
                      className="bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Live
                    </Link>
                    <Link
                      href={`/dashboard/${e.id}`}
                      className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Analisi
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick links: flex così un solo riquadro (es. Accedi) resta centrato, non incollato a sinistra */}
        <div className="flex flex-wrap justify-center gap-4">
          {session?.role === 'admin' || session?.role === 'entry' ? (
            <Link
              href={session.role === 'admin' ? '/admin' : `/entry/${session.electionId}`}
              className="bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl p-6 text-center transition-colors group w-full max-w-sm"
            >
              <div className="text-3xl mb-3">{session.role === 'admin' ? '⚙️' : '📝'}</div>
              <h3 className="text-white font-semibold">
                {session.role === 'admin' ? 'Pannello Admin' : 'Inserimento dati'}
              </h3>
              <p className="text-blue-200 text-sm mt-1">
                {session.role === 'admin' ? 'Gestisci elezioni e configurazione' : 'Inserisci i voti della tua sezione'}
              </p>
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl p-6 text-center transition-colors w-full max-w-sm"
            >
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="text-white font-semibold">Accedi</h3>
              <p className="text-blue-200 text-sm mt-1">Login per rappresentanti e admin</p>
            </Link>
          )}

          {allElections.length > 0 && (
            <Link
              href={`/live/${allElections[0].id}`}
              className="bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl p-6 text-center transition-colors w-full max-w-sm"
            >
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-white font-semibold">Risultati Live</h3>
              <p className="text-blue-200 text-sm mt-1">Segui lo spoglio in diretta</p>
            </Link>
          )}

          {allElections.length > 0 && (
            <Link
              href={`/dashboard/${allElections[0].id}`}
              className="bg-white/10 hover:bg-white/20 backdrop-blur rounded-xl p-6 text-center transition-colors w-full max-w-sm"
            >
              <div className="text-3xl mb-3">🔍</div>
              <h3 className="text-white font-semibold">Analisi & Proiezioni</h3>
              <p className="text-blue-200 text-sm mt-1">Confronti e proiezioni seggi</p>
            </Link>
          )}
        </div>

        {session && (
          <p className="text-center text-blue-300 text-sm mt-8">
            Connesso come <strong className="text-white">{session.username}</strong> ({session.role})
            {' · '}
            <LogoutButton className="underline hover:text-white text-blue-300 bg-transparent border-0 p-0 cursor-pointer text-sm font-inherit inline" />
          </p>
        )}
      </div>
    </div>
  )
}
