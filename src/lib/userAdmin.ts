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

export type UserImportInput = {
  username: string
  password: string
  name?: string | null
  role: string
  listId?: number | null
  sectionIds?: number[]
  active?: boolean
  electionId?: number | null
}

export type UserImportResult = {
  created: number
  errors: { row: number; username: string; message: string }[]
}

function normLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function importUsers(
  rows: UserImportInput[],
  opts?: { startRow?: number }
): Promise<UserImportResult> {
  const startRow = opts?.startRow ?? 2
  const result: UserImportResult = { created: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const line = startRow + i
    try {
      const user = await createUser({
        username: row.username,
        password: row.password,
        name: row.name,
        role: row.role,
        electionId: row.electionId,
        listId: row.listId,
        sectionIds: row.sectionIds,
      })
      if (row.active === false) {
        await updateUser(user.id, { active: false })
      }
      result.created++
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Errore'
      result.errors.push({ row: line, username: row.username, message: msg })
    }
  }

  return result
}

export async function resolveImportRowsForElection(
  electionId: number,
  parsed: {
    username: string
    password: string
    name: string | null
    role: string
    listName: string | null
    sectionNumbers: number[]
    active: boolean
  }[]
): Promise<{ inputs: UserImportInput[]; errors: { row: number; username: string; message: string }[] }> {
  const lists = await prisma.electionList.findMany({
    where: { electionId },
    select: { id: true, name: true },
  })
  const sections = await prisma.section.findMany({
    where: { electionId },
    select: { id: true, number: true },
  })
  const listByNorm = new Map(lists.map(l => [normLabel(l.name), l.id]))
  const sectionByNumber = new Map(sections.map(s => [s.number, s.id]))

  const inputs: UserImportInput[] = []
  const errors: { row: number; username: string; message: string }[] = []

  parsed.forEach((row, i) => {
    const line = i + 2
    if (row.role === 'admin') {
      inputs.push({
        username: row.username,
        password: row.password,
        name: row.name,
        role: 'admin',
        electionId: null,
        listId: null,
        active: row.active,
      })
      return
    }

    let listId: number | null = null
    if (row.listName) {
      const id = listByNorm.get(normLabel(row.listName))
      if (!id) {
        errors.push({
          row: line,
          username: row.username,
          message: `Lista «${row.listName}» non trovata in questa elezione.`,
        })
        return
      }
      listId = id
    }

    const sectionIds: number[] = []
    for (const num of row.sectionNumbers) {
      const sid = sectionByNumber.get(num)
      if (!sid) {
        errors.push({
          row: line,
          username: row.username,
          message: `Sezione n. ${num} non trovata.`,
        })
        return
      }
      sectionIds.push(sid)
    }

    inputs.push({
      username: row.username,
      password: row.password,
      name: row.name,
      role: row.role,
      electionId,
      listId,
      sectionIds: sectionIds.length > 0 ? sectionIds : undefined,
      active: row.active,
    })
  })

  return { inputs, errors }
}

export async function resolveImportRowsGlobal(
  parsed: {
    username: string
    password: string
    name: string | null
    role: string
    listName: string | null
    sectionNumbers: number[]
    active: boolean
    electionLabel: string | null
  }[]
): Promise<{ inputs: UserImportInput[]; errors: { row: number; username: string; message: string }[] }> {
  const elections = await prisma.election.findMany({
    select: { id: true, name: true, commune: true },
  })
  const electionByNorm = new Map<string, number>()
  for (const e of elections) {
    electionByNorm.set(normLabel(e.name), e.id)
    electionByNorm.set(normLabel(`${e.name} (${e.commune})`), e.id)
    electionByNorm.set(normLabel(e.commune), e.id)
  }

  const allLists = await prisma.electionList.findMany({
    select: { id: true, name: true, electionId: true },
  })
  const listsByElection = new Map<number, Map<string, number>>()
  for (const l of allLists) {
    if (!listsByElection.has(l.electionId)) listsByElection.set(l.electionId, new Map())
    listsByElection.get(l.electionId)!.set(normLabel(l.name), l.id)
  }

  const allSections = await prisma.section.findMany({
    select: { id: true, number: true, electionId: true },
  })
  const sectionsByElection = new Map<number, Map<number, number>>()
  for (const s of allSections) {
    if (!sectionsByElection.has(s.electionId)) sectionsByElection.set(s.electionId, new Map())
    sectionsByElection.get(s.electionId)!.set(s.number, s.id)
  }

  const inputs: UserImportInput[] = []
  const errors: { row: number; username: string; message: string }[] = []

  parsed.forEach((row, i) => {
    const line = i + 2
    if (row.role === 'admin') {
      inputs.push({
        username: row.username,
        password: row.password,
        name: row.name,
        role: 'admin',
        electionId: null,
        listId: null,
        active: row.active,
      })
      return
    }

    const label = row.electionLabel?.trim()
    if (!label) {
      errors.push({ row: line, username: row.username, message: 'Elezione mancante.' })
      return
    }
    const electionId = electionByNorm.get(normLabel(label))
    if (!electionId) {
      errors.push({
        row: line,
        username: row.username,
        message: `Elezione «${label}» non trovata.`,
      })
      return
    }

    let listId: number | null = null
    if (row.listName) {
      const listMap = listsByElection.get(electionId)
      const id = listMap?.get(normLabel(row.listName))
      if (!id) {
        errors.push({
          row: line,
          username: row.username,
          message: `Lista «${row.listName}» non trovata nell’elezione indicata.`,
        })
        return
      }
      listId = id
    }

    const sectionByNumber = sectionsByElection.get(electionId) ?? new Map()
    const sectionIds: number[] = []
    for (const num of row.sectionNumbers) {
      const sid = sectionByNumber.get(num)
      if (!sid) {
        errors.push({
          row: line,
          username: row.username,
          message: `Sezione n. ${num} non trovata nell’elezione indicata.`,
        })
        return
      }
      sectionIds.push(sid)
    }

    inputs.push({
      username: row.username,
      password: row.password,
      name: row.name,
      role: row.role,
      electionId,
      listId,
      sectionIds: sectionIds.length > 0 ? sectionIds : undefined,
      active: row.active,
    })
  })

  return { inputs, errors }
}
