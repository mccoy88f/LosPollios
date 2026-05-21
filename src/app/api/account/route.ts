import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { getSession, signToken, setTokenCookie } from '@/lib/auth'
import { getAllowedSectionIdsForUser } from '@/lib/userAccess'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const user = await prisma.user.findUnique({
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
    },
  })

  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const allowedSectionIds = await getAllowedSectionIdsForUser(user.id)

  return NextResponse.json({
    user: {
      ...user,
      allowedSectionIds,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const body = await req.json()
  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

  if (name !== undefined && name.length > 120) {
    return NextResponse.json({ error: 'Nome troppo lungo' }, { status: 400 })
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La nuova password deve avere almeno 6 caratteri' }, { status: 400 })
    }
    if (!currentPassword) {
      return NextResponse.json({ error: 'Inserisci la password attuale' }, { status: 400 })
    }
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const patch: { name?: string | null; password?: string } = {}

  if (name !== undefined) {
    patch.name = name || null
  }

  if (newPassword) {
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Password attuale non corretta' }, { status: 400 })
    }
    patch.password = await bcrypt.hash(newPassword, 10)
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Nessuna modifica da salvare' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: patch,
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      electionId: true,
      listId: true,
    },
  })

  const allowed = await getAllowedSectionIdsForUser(updated.id)
  const allowedSectionIds = allowed ?? undefined

  const token = await signToken({
    userId: updated.id,
    username: updated.username,
    role: updated.role,
    electionId: updated.electionId ?? undefined,
    listId: updated.listId ?? undefined,
    allowedSectionIds,
  })

  const res = NextResponse.json({ user: { ...updated, allowedSectionIds: allowed } })
  res.cookies.set(setTokenCookie(token))
  return res
}
