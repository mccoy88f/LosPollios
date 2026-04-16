import { prisma } from '@/lib/db'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = { setup: 'Configurazione', active: 'Attiva', closed: 'Chiusa' }
const STATUS_COLOR: Record<string, string> = { setup: 'bg-yellow-100 text-yellow-800', active: 'bg-green-100 text-green-800', closed: 'bg-gray-100 text-gray-700' }

export default async function AdminPage() {
  const elections = await prisma.election.findMany({
    orderBy: { date: 'desc' },
    include: {
      _count: { select: { sections: true, lists: true } },
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Elezioni</h1>
          <p className="text-gray-500 mt-1">Gestisci le elezioni comunali</p>
        </div>
        <Link
          href="/admin/elections/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuova elezione
        </Link>
      </div>

      {elections.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">🗳️</p>
          <p className="font-medium text-gray-600">Nessuna elezione configurata</p>
          <p className="text-sm mt-1">Crea la prima elezione per iniziare</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {elections.map((e) => (
            <div key={e.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="font-semibold text-gray-900">{e.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[e.status]}`}>
                      {STATUS_LABEL[e.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {e.commune} · {formatDate(e.date)} · {e._count.sections} sezioni · {e._count.lists} liste
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/live/${e.id}`} className="text-sm text-green-600 hover:text-green-700 font-medium px-3 py-1.5 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                  Live
                </Link>
                <Link href={`/dashboard/${e.id}`} className="text-sm text-purple-600 hover:text-purple-700 font-medium px-3 py-1.5 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
                  Analisi
                </Link>
                <Link href={`/admin/elections/${e.id}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                  Gestisci
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
