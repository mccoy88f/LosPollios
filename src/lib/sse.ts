// Server-Sent Events pub/sub (in-memory, single server)
type Listener = (data: unknown) => void

const listeners = new Map<number, Set<Listener>>()

export function sseSubscribe(electionId: number, fn: Listener): () => void {
  if (!listeners.has(electionId)) listeners.set(electionId, new Set())
  listeners.get(electionId)!.add(fn)
  return () => listeners.get(electionId)?.delete(fn)
}

export function ssePublish(electionId: number, data: unknown): void {
  listeners.get(electionId)?.forEach(fn => fn(data))
}
