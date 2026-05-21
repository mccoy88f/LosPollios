import { formatNumber, formatPercent } from '@/lib/utils'
import type { LiveResultsData } from '@/components/live/liveTypes'

export function LiveKpiStrip({
  data,
  lastPulse,
  hasWarnings,
}: {
  data: LiveResultsData
  lastPulse: Date | null
  hasWarnings: boolean
}) {
  const { progress, turnout, lastDataUpdateAt } = data

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-neutral-800">
        <KpiCell label="Scrutinio voti" value={`${progress.percentage.toFixed(1)}%`} />
        <KpiCell label="Affluenza" value={formatPercent(turnout.percentage)} />
        <KpiCell
          label="Sezioni"
          value={`${progress.sectionsCounted}/${progress.totalSections}`}
        />
      </div>

      <div className="px-4 py-2 bg-gray-50 dark:bg-neutral-950 border-t border-gray-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-neutral-400">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {lastPulse && (
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
              Live · {lastPulse.toLocaleTimeString('it-IT')}
            </span>
          )}
          {lastDataUpdateAt && (
            <time dateTime={lastDataUpdateAt} className="tabular-nums">
              Salvataggio:{' '}
              {new Date(lastDataUpdateAt).toLocaleString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          )}
        </div>
        {hasWarnings && (
          <span className="text-amber-800 font-medium">⚠ Dati da verificare</span>
        )}
      </div>

      <div className="px-4 pb-3 pt-2">
        <div className="flex justify-between text-xs text-gray-500 dark:text-neutral-400 mb-1 tabular-nums">
          <span>Avanzamento scrutinio</span>
          <span>{progress.percentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-2">
          <div
            className="bg-brand-800 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progress.percentage)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 tabular-nums">
          {formatNumber(progress.scrutinizedVotes)} / {formatNumber(progress.expectedVotes)} voti lista su votanti
        </p>
      </div>
    </div>
  )
}

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 text-center min-w-0">
      <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tabular-nums">{value}</div>
      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-neutral-400 leading-tight">{label}</div>
    </div>
  )
}
