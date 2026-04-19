'use client'

import { useState } from 'react'
import Link from 'next/link'
import ElectionStatusForm from './ElectionStatusForm'
import ElectionArchiveControl from './ElectionArchiveControl'
import ElectionMetadataForm from './ElectionMetadataForm'

type MetadataInitial = {
  name: string
  commune: string
  date: string | Date
  type: string
  totalSeats: number
  threshold: number
  notes: string | null
  eligibleVotersTotal: number | null
}

export default function ElectionDetailInfoCard({
  electionId,
  name,
  commune,
  dateLabel,
  archivedNotice,
  status,
  archived,
  sectionsCounted,
  sectionsTotal,
  totalVoters,
  actualVoters,
  listsCount,
  eligibleVotersTotal,
  metadataInitial,
  metadataKey,
}: {
  electionId: number
  name: string
  commune: string
  dateLabel: string
  archivedNotice: boolean
  status: string
  archived: boolean
  sectionsCounted: number
  sectionsTotal: number
  totalVoters: number
  actualVoters: number
  listsCount: number
  /** Tetto comunale (null = nessun limite) */
  eligibleVotersTotal: number | null
  metadataInitial: MetadataInitial
  metadataKey: string
}) {
  const [editing, setEditing] = useState(false)
  const remaining =
    eligibleVotersTotal != null ? eligibleVotersTotal - totalVoters : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-gray-900 text-lg">{name}</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {commune} · {dateLabel}
          </p>
          {archivedNotice && (
            <p className="text-xs text-slate-600 mt-2 font-medium">
              In archivio — visibile solo nella sezione Archivio in amministrazione
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ElectionStatusForm electionId={electionId} currentStatus={status} />
          <button
            type="button"
            aria-expanded={editing}
            onClick={() => setEditing(e => !e)}
            className="text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 px-3 py-1.5 rounded-lg font-medium shadow-sm"
          >
            {editing ? 'Chiudi modifica' : 'Modifica'}
          </button>
          <ElectionArchiveControl electionId={electionId} status={status} archived={archived} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        {[
          ['Sezioni', `${sectionsCounted} / ${sectionsTotal}`],
          [
            eligibleVotersTotal != null ? 'Somma sezioni (aventi diritto)' : 'Aventi diritto al voto (somma sezioni)',
            totalVoters.toLocaleString('it-IT'),
          ],
          ['Votanti reali', actualVoters.toLocaleString('it-IT')],
          ['Liste', listsCount],
        ].map(([label, value]) => (
          <div key={label as string} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {eligibleVotersTotal != null && (
        <div
          className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
            remaining != null && remaining < 0
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          <strong>Tetto comunale:</strong> {eligibleVotersTotal.toLocaleString('it-IT')} aventi diritto ·{' '}
          <strong>Residuo rispetto alla somma sezioni:</strong>{' '}
          {remaining != null ? remaining.toLocaleString('it-IT') : '—'}
          {remaining != null && remaining < 0 && (
            <span className="block text-xs mt-1">Riduci i valori nelle sezioni o aumenta il tetto in Modifica.</span>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-600 leading-relaxed">
        <strong>Tetto comunale:</strong> impostalo con <strong>Modifica</strong> (totale aventi diritto a livello di comune).{' '}
        <strong>Per sezione:</strong> nella pagina{' '}
        <Link
          href={`/admin/elections/${electionId}/sections`}
          className="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
        >
          Sezioni
        </Link>{' '}
        — la somma non può superare il tetto (se definito).
      </p>

      {editing && (
        <ElectionMetadataForm
          key={metadataKey}
          electionId={electionId}
          initial={metadataInitial}
        />
      )}
    </div>
  )
}
