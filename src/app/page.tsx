import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { SiteTopNav } from '@/components/SiteTopNav'
import { Card, CardBody, PageHeader } from '@/components/ui/Card'
import { BarChart3, ClipboardList, Radio, Settings, Vote } from 'lucide-react'

export default async function HomePage() {
  const session = await getSession()
  const elections = await prisma.election.findMany({
    where: { status: { not: 'setup' } },
    orderBy: { date: 'desc' },
    take: 12,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteTopNav
        crumbs={[{ label: 'Home' }]}
        username={session?.username}
        showLogout
        primaryLinks={
          session?.role === 'admin'
            ? [
                { label: 'Elezioni', href: '/admin' },
                { label: 'Accessi', href: '/admin/users' },
              ]
            : undefined
        }
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <PageHeader
          title="LosPollios"
          description="Hub operativo per spoglio, live e inserimento dati di sezione."
        />

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          {session?.role === 'admin' && (
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
          {session?.role === 'entry' && session.electionId && (
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
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                      >
                        <Radio className="w-4 h-4" aria-hidden />
                        Live
                      </Link>
                      <Link
                        href={`/dashboard/${e.id}`}
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
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
            <CardBody className="text-center text-gray-500 py-12">
              <Vote className="w-10 h-10 mx-auto mb-3 text-gray-300" aria-hidden />
              <p>Nessuna elezione attiva al momento.</p>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  )
}
