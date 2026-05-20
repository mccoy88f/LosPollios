import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { syncUserSections } from '@/lib/userAccess'

const userSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  electionId: true,
  listId: true,
  active: true,
  createdAt: true,
  election: { select: { id: true, name: true, commune: true } },
  list: { select: { id: true, name: true } },
  allowedSections: { select: { sectionId: true, section: { select: { id: true, number: true, name: true } } } },
} as const

export type UserAdminRow = {
  id: number
  username: string
  name: string | null
  role: string
  electionId: number | null
  listId: number | null
  active: boolean
  createdAt: Date
  election: { id: number; name: string; commune: string } | null
  list: { id: number; name: string } | null
  allowedSections: { sectionId: number; section: { id: number; number: number; name: string | null } }[]
}

export function serializeUser(u: UserAdminRow) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    electionId: u.electionId,
    listId: u.listId,
    active: u.active,
    createdAt: u.createdAt,
    election: u.election,
    list: u.list,
    sectionIds: u.allowedSections.map(a => a.sectionId),
    sections: u.allowedSections.map(a => a.section),
  }
}

export async function listUsers(electionId?: number) {
  const users = await prisma.user.findMany({
    where: electionId != null ? { electionId } : undefined,
    select: userSelect,
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
  })
  return users.map(serializeUser)
}

export async function createUser(data: {
  username: string
  password: string
  name?: string | null
  role?: string
  electionId?: number | null
  listId?: number | null
  sectionIds?: number[]
}) {
  const { username, password, name, role, electionId, listId, sectionIds } = data
  if (!username || !password) throw new Error('Username e password obbligatori')

  const roleVal = role ?? 'entry'
  if (roleVal !== 'admin' && !electionId) {
    throw new Error('Gli utenti non admin devono essere collegati a un\'elezione')
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      username,
      password: hashed,
      name: name ?? null,
      role: roleVal,
      electionId: electionId ?? null,
      listId: listId ?? null,
    },
    select: userSelect,
  })

  if (sectionIds?.length && electionId) {
    await syncUserSections(user.id, sectionIds, electionId)
  }

  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: userSelect })
  return serializeUser(full)
}

export async function updateUser(
  userId: number,
  data: {
    username?: string
    password?: string
    name?: string | null
    role?: string
    electionId?: number | null
    listId?: number | null
    active?: boolean
    sectionIds?: number[]
  }
) {
  const existing = await prisma.user.findUnique({ where: { id: userId } })
  if (!existing) throw new Error('Utente non trovato')

  const roleVal = data.role ?? existing.role
  const electionId = data.electionId !== undefined ? data.electionId : existing.electionId

  if (roleVal !== 'admin' && !electionId) {
    throw new Error('Gli utenti non admin devono essere collegati a un\'elezione')
  }

  const patch: Record<string, unknown> = {}
  if (data.username != null) patch.username = data.username
  if (data.name !== undefined) patch.name = data.name
  if (data.role != null) patch.role = data.role
  if (data.electionId !== undefined) patch.electionId = data.electionId
  if (data.listId !== undefined) patch.listId = data.listId
  if (data.active !== undefined) patch.active = data.active
  if (data.password) patch.password = await bcrypt.hash(data.password, 10)

  if (roleVal === 'admin') {
    patch.electionId = null
    patch.listId = null
    await prisma.userSection.deleteMany({ where: { userId } })
  }

  await prisma.user.update({ where: { id: userId }, data: patch })

  if (data.sectionIds !== undefined && roleVal !== 'admin') {
    await syncUserSections(userId, data.sectionIds, electionId)
  } else if (data.electionId !== undefined && data.electionId !== existing.electionId) {
    await prisma.userSection.deleteMany({ where: { userId } })
  }

  const full = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: userSelect })
  return serializeUser(full)
}

export async function deleteUser(userId: number) {
  await prisma.user.delete({ where: { id: userId } })
}
