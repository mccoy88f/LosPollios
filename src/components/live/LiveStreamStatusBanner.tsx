'use client'

import { Alert } from '@/components/ui/Alert'
import type { ElectionStreamStatus } from '@/hooks/useElectionStream'

export function LiveStreamStatusBanner({ status }: { status: ElectionStreamStatus }) {
  if (status === 'live' || status === 'connecting') return null

  if (status === 'reconnecting') {
    return (
      <Alert variant="warning" title="Riconnessione in corso">
        Il collegamento in tempo reale si è interrotto (rete o schermo spento); il browser sta
        tentando di riconnettersi in automatico. Attendi qualche secondo: se non torna «live»,
        ricarica la pagina.
      </Alert>
    )
  }

  return (
    <Alert variant="error" title="Collegamento perso">
      Non riceviamo più aggiornamenti in tempo reale da oltre un minuto. Su cellulare riapri il
      browser o <strong>ricarica la pagina</strong> quando la rete è stabile, così riparti con un
      collegamento fresco e vedi i dati aggiornati degli altri operatori.
    </Alert>
  )
}
