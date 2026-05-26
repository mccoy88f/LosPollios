import prisma from '@/lib/db'

/** Considerato "collegato" se ha inviato heartbeat negli ultimi N secondi */
export const PUBLIC_BOARD_PRESENCE_TTL_SEC = 90

const PRUNE_OLDER_THAN_MS = 60 * 60 * 1000

export async function touchPublicBoardPresence(boardToken: string, clientId: string): Promise<void> {
  if (!clientId?.trim() || !boardToken?.trim()) return

  await prisma.publicBoardPresence.upsert({
    where: {
      clientId_boardToken: { clientId: clientId.trim(), boardToken: boardToken.trim() },
    },
    create: { clientId: clientId.trim(), boardToken: boardToken.trim() },
    update: { lastSeenAt: new Date() },
  })

  if (Math.random() < 0.03) {
    await prisma.publicBoardPresence.deleteMany({
      where: { lastSeenAt: { lt: new Date(Date.now() - PRUNE_OLDER_THAN_MS) } },
    })
  }
}

export async function countActivePublicBoardViewers(boardToken: string): Promise<number> {
  const cutoff = new Date(Date.now() - PUBLIC_BOARD_PRESENCE_TTL_SEC * 1000)
  return prisma.publicBoardPresence.count({
    where: { boardToken: boardToken.trim(), lastSeenAt: { gte: cutoff } },
  })
}
