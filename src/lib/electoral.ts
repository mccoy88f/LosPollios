// Calcoli elettorali per elezioni comunali italiane

export interface ListInput {
  listId: number
  listName: string
  shortName?: string
  color?: string
  votes: number
  coalition?: string
  candidateMayor?: string
}

export interface CoalitionResult {
  coalition: string
  candidateMayor?: string
  totalVotes: number
  percentage: number
  lists: ListInput[]
  isWinner: boolean
}

export interface SeatProjection {
  listId: number
  listName: string
  shortName?: string
  color?: string
  votes: number
  percentage: number
  seats: number
  aboveThreshold: boolean
  coalition?: string
  candidateMayor?: string
}

export interface ElectionProjection {
  coalitions: CoalitionResult[]
  seats: SeatProjection[]
  totalVotes: number
  winningCoalition?: CoalitionResult
  mayorElected?: string
  needsRunoff: boolean
}

// Metodo D'Hondt per distribuzione seggi
export function dHondt(votes: { id: number; votes: number }[], totalSeats: number): Map<number, number> {
  const result = new Map<number, number>()
  if (totalSeats === 0 || votes.length === 0) return result
  votes.forEach(v => result.set(v.id, 0))

  for (let s = 0; s < totalSeats; s++) {
    let maxQ = -1
    let winner = -1
    for (const v of votes) {
      if (v.votes === 0) continue
      const q = v.votes / ((result.get(v.id) ?? 0) + 1)
      if (q > maxQ) { maxQ = q; winner = v.id }
    }
    if (winner !== -1) result.set(winner, (result.get(winner) ?? 0) + 1)
  }
  return result
}

// Raggruppa liste per coalizione / candidato sindaco
export function groupCoalitions(lists: ListInput[], totalVotes: number): CoalitionResult[] {
  const map = new Map<string, CoalitionResult>()

  for (const list of lists) {
    const key = list.coalition ?? list.candidateMayor ?? `__${list.listId}`
    if (!map.has(key)) {
      map.set(key, {
        coalition: list.coalition ?? list.candidateMayor ?? list.listName,
        candidateMayor: list.candidateMayor,
        totalVotes: 0,
        percentage: 0,
        lists: [],
        isWinner: false,
      })
    }
    const c = map.get(key)!
    c.totalVotes += list.votes
    c.lists.push(list)
  }

  const coalitions = Array.from(map.values())
    .map(c => ({ ...c, percentage: totalVotes > 0 ? (c.totalVotes / totalVotes) * 100 : 0 }))
    .sort((a, b) => b.totalVotes - a.totalVotes)

  if (coalitions.length > 0) coalitions[0].isWinner = true
  return coalitions
}

// Calcola proiezione seggi
export function calculateProjection(
  lists: ListInput[],
  totalSeats: number,
  electionType: string,       // 'large' | 'small'
  threshold: number = 3.0
): ElectionProjection {
  const totalVotes = lists.reduce((s, l) => s + l.votes, 0)
  const coalitions = groupCoalitions(lists, totalVotes)
  const winningCoalition = coalitions[0]

  const needsRunoff =
    electionType === 'large' &&
    !!winningCoalition &&
    totalVotes > 0 &&
    winningCoalition.percentage <= 50

  // Seggi per la coalizione vincente
  let mayorSeats: number
  let oppositionSeats: number

  if (electionType === 'large') {
    // Minimo 60% dei seggi alla coalizione vincente
    const proportional = totalVotes > 0 ? Math.round(totalSeats * winningCoalition.totalVotes / totalVotes) : 0
    mayorSeats = Math.max(Math.ceil(totalSeats * 0.6), proportional)
  } else {
    // 2/3 dei seggi alla coalizione vincente
    mayorSeats = Math.round(totalSeats * (2 / 3))
  }
  oppositionSeats = totalSeats - mayorSeats

  // Liste idonee (sopra soglia per comuni grandi)
  const isEligible = (l: ListInput) =>
    electionType === 'large' ? totalVotes > 0 && (l.votes / totalVotes) * 100 >= threshold : true

  const winningListIds = new Set(winningCoalition?.lists.map(l => l.listId) ?? [])

  const eligibleWinning = lists
    .filter(l => winningListIds.has(l.listId) && isEligible(l))
    .map(l => ({ id: l.listId, votes: l.votes }))

  const eligibleOpposition = lists
    .filter(l => !winningListIds.has(l.listId) && isEligible(l))
    .map(l => ({ id: l.listId, votes: l.votes }))

  const winningSeats = dHondt(eligibleWinning, mayorSeats)
  const oppositionSeatsMap = dHondt(eligibleOpposition, oppositionSeats)

  const seats: SeatProjection[] = lists
    .map(l => ({
      listId:        l.listId,
      listName:      l.listName,
      shortName:     l.shortName,
      color:         l.color,
      votes:         l.votes,
      percentage:    totalVotes > 0 ? (l.votes / totalVotes) * 100 : 0,
      seats:         (winningSeats.get(l.listId) ?? 0) + (oppositionSeatsMap.get(l.listId) ?? 0),
      aboveThreshold: isEligible(l),
      coalition:     l.coalition,
      candidateMayor: l.candidateMayor,
    }))
    .sort((a, b) => b.votes - a.votes)

  return {
    coalitions,
    seats,
    totalVotes,
    winningCoalition,
    mayorElected: !needsRunoff ? winningCoalition?.candidateMayor : undefined,
    needsRunoff,
  }
}

// Proiezione voti finali in base alle sezioni scrutinate
export function projectFinalVotes(
  currentVotes: number,
  sectionsCounted: number,
  totalSections: number
): number {
  if (sectionsCounted === 0) return 0
  return Math.round(currentVotes * (totalSections / sectionsCounted))
}
