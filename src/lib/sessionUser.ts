import { prisma } from '@/lib/db'
import type { JwtPayload } from '@/lib/auth'

export async function getSessionUserProfile(session: JwtPayload) {
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      electionId: true,
      listId: true,
      election: { select: { id: true, name: true, commune: true } },
      list: { select: { id: true, name: true } },
      themePreference: true,
    },
  })
}
