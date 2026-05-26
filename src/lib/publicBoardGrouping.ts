import { electionHasCoalitions } from '@/lib/liveElection'

export type PublicBoardListItem = {
  listId: number
  name: string
  shortName: string | null
  color: string
  votes: number
  /** % sul totale voti di lista (barre comparative tra liste) */
  percentOfListVotes: number
  /** % sui votanti (come in live) */
  pctOnVoters: number
  coalition: string | null
  candidateMayor: string | null
  listLogoUrl: string | null
  coalitionLogoUrl: string | null
}

export type PublicBoardCoalitionBlock = {
  name: string
  votes: number
  pctOnVoters: number
  color: string
  coalitionLogoUrl: string | null
  mayorLabel: string | null
  /** Prime due liste per voti, mostrate sotto la coalizione */
  topLists: PublicBoardListItem[]
  /** Altre liste della stessa coalizione (zona compatta sotto) */
  moreLists: PublicBoardListItem[]
}

export type PublicBoardListLayout =
  | {
      mode: 'coalitions'
      hasCoalitions: true
      heroCoalitions: PublicBoardCoalitionBlock[]
      restCoalitions: PublicBoardCoalitionBlock[]
      standaloneLists: PublicBoardListItem[]
    }
  | {
      mode: 'lists'
      hasCoalitions: false
      heroLists: PublicBoardListItem[]
      restLists: PublicBoardListItem[]
    }

function coalitionBlock(name: string, lists: PublicBoardListItem[], totalVoters: number): PublicBoardCoalitionBlock {
  const sorted = [...lists].sort((a, b) => b.votes - a.votes)
  const votes = sorted.reduce((s, l) => s + l.votes, 0)
  const mayors = new Set(sorted.map(l => l.candidateMayor?.trim()).filter(Boolean) as string[])
  return {
    name,
    votes,
    pctOnVoters: totalVoters > 0 ? (votes / totalVoters) * 100 : 0,
    color: sorted[0]?.color ?? '#6366f1',
    coalitionLogoUrl:
      sorted.find(l => l.coalitionLogoUrl)?.coalitionLogoUrl ?? sorted[0]?.coalitionLogoUrl ?? null,
    mayorLabel:
      mayors.size === 1 ? [...mayors][0] : mayors.size > 1 ? 'Più candidati sindaco' : null,
    topLists: sorted.slice(0, 2),
    moreLists: sorted.slice(2),
  }
}

export function buildPublicBoardListLayout(
  lists: PublicBoardListItem[],
  totalVoters: number
): PublicBoardListLayout {
  const hasCoalitions = electionHasCoalitions(lists)

  if (hasCoalitions) {
    const byCoalition = new Map<string, PublicBoardListItem[]>()
    const standalone: PublicBoardListItem[] = []

    for (const l of lists) {
      const key = l.coalition?.trim()
      if (!key) {
        standalone.push(l)
        continue
      }
      if (!byCoalition.has(key)) byCoalition.set(key, [])
      byCoalition.get(key)!.push(l)
    }

    const coalitions = Array.from(byCoalition.entries())
      .map(([name, group]) => coalitionBlock(name, group, totalVoters))
      .sort((a, b) => b.votes - a.votes)

    return {
      mode: 'coalitions',
      hasCoalitions: true,
      heroCoalitions: coalitions.slice(0, 2),
      restCoalitions: coalitions.slice(2),
      standaloneLists: [...standalone].sort((a, b) => b.votes - a.votes),
    }
  }

  const sorted = [...lists].sort((a, b) => b.votes - a.votes)
  return {
    mode: 'lists',
    hasCoalitions: false,
    heroLists: sorted.slice(0, 2),
    restLists: sorted.slice(2),
  }
}
