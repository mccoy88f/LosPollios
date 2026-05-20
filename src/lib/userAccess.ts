import prisma from '@/lib/db'
import type { JwtPayload } from '@/lib/auth'

/** null = tutte le sezioni dell'elezione; array non vuoto = solo quelle */
export async function getAllowedSectionIdsForUser(userId: number): Promise<number[] | null> {
  const rows = await prisma.userSection.findMany({
    where: { userId },
    select: { sectionId: true },
  })
  if (rows.length === 0) return null
  return rows.map(r => r.sectionId)
}

export function canAccessSection(
  session: JwtPayload,
  sectionId: number,
  allowedSectionIds: number[] | null | undefined
): boolean {
  if (session.role === 'admin') return true
  if (allowedSectionIds == null || allowedSectionIds.length === 0) return true
  return allowedSectionIds.includes(sectionId)
}

export async function assertEntryCanWriteSection(
  session: JwtPayload,
  electionId: number,
  sectionId: number
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!session || session.role === 'viewer') {
    return { ok: false, status: 403, error: 'Non autorizzato' }
  }
  if (session.role === 'admin') return { ok: true }

  if (session.electionId != null && session.electionId !== electionId) {
    return { ok: false, status: 403, error: 'Accesso limitato a un\'altra elezione' }
  }

  const allowed =
    session.allowedSectionIds ??
    (await getAllowedSectionIdsForUser(session.userId))
  if (!canAccessSection(session, sectionId, allowed)) {
    return { ok: false, status: 403, error: 'Sezione non autorizzata per questo account' }
  }

  return { ok: true }
}

export async function syncUserSections(userId: number, sectionIds: number[] | undefined, electionId: number | null) {
  await prisma.userSection.deleteMany({ where: { userId } })
  if (!sectionIds?.length) return

  if (!electionId) {
    throw new Error('Sezioni consentite solo per utenti legati a un\'elezione')
  }

  const valid = await prisma.section.findMany({
    where: { electionId, id: { in: sectionIds } },
    select: { id: true },
  })
  if (valid.length !== sectionIds.length) {
    throw new Error('Una o più sezioni non appartengono all\'elezione selezionata')
  }

  await prisma.userSection.createMany({
    data: valid.map(s => ({ userId, sectionId: s.id })),
    skipDuplicates: true,
  })
}
