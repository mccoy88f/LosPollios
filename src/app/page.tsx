import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { SiteTopNav } from '@/components/SiteTopNav'
import { buildAppMenuSections } from '@/lib/navMenu'
import { getSessionUserProfile } from '@/lib/sessionUser'
import { Card, CardBody, PageHeader } from '@/components/ui/Card'
import { BarChart3, ClipboardList, History, Radio, Settings, Users, Vote } from 'lucide-react'

export default async function HomePage() {
  const session = await getSession()
  if (!session) return null
  const profile = await getSessionUserProfile(session)
  const elections = await prisma.election.findMany({
    where: { status: { not: 'setup' } },
    orderBy: { date: 'desc' },
    take: 12,
  })

  return (
    <div className="page-shell">
      <SiteTopNav
        menuSections={buildAppMenuSections(session)}
        username={session.username}
        displayName={profile?.name}
      />

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <PageHeader
          title="LosPollios"
          description="Hub operativo per spoglio, live e inserimento dati di sezione."
        />

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          {session.role === 'admin' && (
            <Link href="/admin" className="block group">
              <Card className="p-5 h-full hover:border-brand-300 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-brand-50 text-brand-700">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 group-hover:text-brand-700">Pannello admin</h2>
                    <p className="text-sm text-gray-500 mt-1">Elezioni, sezioni, liste e accessi</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
          {session.role === 'entry' && session.electionId && (
            <Link href={`/entry/${session.electionId}`} className="block group">
              <Card className="p-5 h-full hover:border-brand-300 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-brand-50 text-brand-700">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 group-hover:text-brand-700">Inserimento dati</h2>
                    <p className="text-sm text-gray-500 mt-1">Vai alle sezioni assegnate</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
        </div>

        {elections.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Elezioni</h2>
            <div className="space-y-3">
              {elections.map(e => (
                <Card key={e.id}>
                  <CardBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{e.name}</h3>
                      <p className="text-sm text-gray-500">
                        {e.commune} · {formatDate(e.date)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/live/${e.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-800 text-white text-sm font-medium hover:bg-brand-900"
                      >
                        <Radio className="w-4 h-4" aria-hidden />
                        Live
                      </Link>
                      <Link
                        href={`/live/${e.id}/aggiornamenti`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-600 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800"
                      >
                        <History className="w-4 h-4" aria-hidden />
                        Aggiornamenti
                      </Link>
                      <Link
                        href={`/live/${e.id}/preferenze`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-600 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800"
                      >
                        <Users className="w-4 h-4" aria-hidden />
                        Preferenze
                      </Link>
                      <Link
                        href={`/live/${e.id}?view=analisi`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-600 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-800"
                      >
                        <BarChart3 className="w-4 h-4" aria-hidden />
                        Analisi
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </section>
        ) : (
          <Card>
            <CardBody className="py-8 text-center text-gray-500">
              <Vote className="w-10 h-10 mx-auto mb-2 text-gray-300" aria-hidden />
              <p>Nessuna elezione attiva al momento.</p>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  )
}
