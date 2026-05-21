'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { cn } from '@/lib/cn'
import SectionEntryForm from './SectionEntryForm'

type ListData = {
  id: number
  name: string
  color: string
  candidateMayor: string | null
  candidates: { id: number; firstName: string; lastName: string; order: number }[]
}

type Props = {
  electionId: number
  sectionId: number
  sectionNumber: number
  sectionName: string | null
  sectionLocation: string | null
  theoreticalVoters: number
  readOnly: boolean
  lists: ListData[]
  existingTurnout: {
    votersActual: number
    ballotsValid?: number
    ballotsNull?: number
    ballotsBlank?: number
  } | null
  existingListResults: {
    listId: number
    listVotes: number
    preferences: { candidateId: number; votes: number }[]
  }[]
}

export function EntrySectionWorkspace({
  electionId,
  sectionId,
  sectionNumber,
  sectionName,
  sectionLocation,
  theoreticalVoters,
  readOnly,
  lists,
  existingTurnout,
  existingListResults,
}: Props) {
  const [listFocus, setListFocus] = useState(false)

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full">
      {!listFocus && (
        <>
          <div className="shrink-0 bg-brand-50 border border-brand-200 rounded-xl p-4 mb-3">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900">
                  Sezione {sectionNumber}
                  {sectionName ? ` – ${sectionName}` : ''}
                </h2>
                {sectionLocation && <p className="text-gray-600 text-sm mt-0.5">{sectionLocation}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-accent-700 font-medium">Aventi diritto</p>
                <p className="text-2xl font-bold text-brand-900 tabular-nums">
                  {theoreticalVoters.toLocaleString('it-IT')}
                </p>
              </div>
            </div>
          </div>

          {readOnly && (
            <Alert variant="warning" title="Sezione chiusa" className="shrink-0 mb-3">
              L&apos;amministratore ha terminato lo scrutinio su questa sezione: i dati sono in sola lettura.
            </Alert>
          )}
        </>
      )}

      <SectionEntryForm
        className="flex-1 min-h-0"
        electionId={electionId}
        sectionId={sectionId}
        readOnly={readOnly}
        lists={lists}
        existingTurnout={existingTurnout}
        existingListResults={existingListResults}
        theoreticalVoters={theoreticalVoters}
        onListFocusChange={setListFocus}
        hideChrome={listFocus}
      />

      {!listFocus && (
        <Link
          href={`/entry/${electionId}`}
          className={cn(
            'shrink-0 mt-3 inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-medium rounded-lg',
            'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors'
          )}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Torna alle sezioni
        </Link>
      )}
    </div>
  )
}
