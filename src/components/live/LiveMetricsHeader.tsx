import Link from 'next/link'
import { Card, CardBody } from '@/components/ui/Card'
import { buttonClassName } from '@/components/ui/buttonStyles'
import { formatNumber, formatPercent } from '@/lib/utils'
import { Activity, BarChart3, Users } from 'lucide-react'

export function LiveMetricsHeader({
  electionName,
  commune,
  progress,
  turnout,
  lastPulse,
  lastDataUpdateAt,
  electionId,
  showPreferenzeLink,
}: {
  electionName: string
  commune: string
  progress: {
    percentage: number
    scrutinizedVotes: number
    expectedVotes: number
    sectionsCounted: number
    totalSections: number
  }
  turnout: { percentage: number }
  lastPulse: Date | null
  lastDataUpdateAt?: string | null
  electionId: number
  showPreferenzeLink: boolean
}) {
  return (
    <Card className="border-brand-200 shadow-md">
      <CardBody className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{electionName}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{commune}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <MetricBlock
              icon={BarChart3}
              label="Voti scrutinati"
              value={`${progress.percentage.toFixed(1)}%`}
            />
            <MetricBlock icon={Users} label="Affluenza" value={formatPercent(turnout.percentage)} />
            <MetricBlock
              icon={Activity}
              label="Sezioni"
              value={`${progress.sectionsCounted}/${progress.totalSections}`}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1 tabular-nums">
            <span>Avanzamento scrutinio</span>
            <span>{progress.percentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-brand-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, progress.percentage)}%` }}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-gray-500 mt-2 tabular-nums">
            <span>
              {formatNumber(progress.scrutinizedVotes)} / {formatNumber(progress.expectedVotes)} voti scrutinati
            </span>
            {lastPulse && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                Pagina · {lastPulse.toLocaleTimeString('it-IT')}
              </span>
            )}
            <span>
              {progress.sectionsCounted}/{progress.totalSections} sezioni con affluenza
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
          {lastDataUpdateAt ? (
            <span>
              Ultimo salvataggio dati:{' '}
              <time dateTime={lastDataUpdateAt} className="font-medium text-gray-700">
                {new Date(lastDataUpdateAt).toLocaleString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </time>
            </span>
          ) : (
            <span />
          )}
          <Link href={`/live/${electionId}/aggiornamenti`} className="text-brand-700 hover:underline font-medium">
            Cronologia aggiornamenti →
          </Link>
        </div>

        {showPreferenzeLink && (
          <div className="pt-1 border-t border-gray-100">
            <Link
              href={`/live/${electionId}/preferenze`}
              className={buttonClassName('primary', 'md')}
            >
              Distribuzione preferenze e confronto storico
            </Link>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function MetricBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3
  label: string
  value: string
}) {
  return (
    <div className="text-center min-w-[5rem]">
      <Icon className="w-4 h-4 text-brand-600 mx-auto mb-1" aria-hidden />
      <div className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
