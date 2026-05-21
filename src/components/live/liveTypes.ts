export interface LiveListResult {
  listId: number
  listName: string
  shortName: string | null
  color: string
  listLogoUrl?: string | null
  coalitionLogoUrl?: string | null
  candidateMayor: string | null
  coalition: string | null
  votes: number
  candidates: {
    candidateId: number
    name: string
    votes: number
    listId: number
    personId?: number | null
    order?: number
  }[]
}

export interface LiveSectionStatus {
  id: number
  number: number
  name: string | null
  locked: boolean
  theoreticalVoters: number
  hasTurnout: boolean
  hasResults: boolean
  listsFilled: number
  totalLists: number
  votersActual: number | null
  turnoutPct: number | null
  listVotesSum: number
  ballotsValid: number | null
  sectionWarnings: string[]
}

export interface LiveResultsData {
  election: {
    id: number
    name: string
    commune: string
    date: string
    type: string
    totalSeats: number
    threshold: number
    status: string
  }
  progress: {
    totalSections: number
    sectionsCounted: number
    percentage: number
    scrutinizedVotes: number
    expectedVotes: number
  }
  turnout: {
    totalTheoretical: number
    totalActual: number
    totalValid: number
    totalNull: number
    totalBlank: number
    percentage: number
  }
  lists: LiveListResult[]
  sectionStatus: LiveSectionStatus[]
  dataQuality?: {
    sectionsWithDataWarnings: number
    listVotesExceedRegisteredVoters: boolean
  }
  lastUpdate: string
  lastDataUpdateAt?: string | null
}
