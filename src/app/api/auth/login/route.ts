import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { signToken, setTokenCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Credenziali mancanti' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !user.active) {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return NextResponse.json({ error: 'Password errata' }, { status: 401 })
  }

  const token = await signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    electionId: user.electionId ?? undefined,
    listId: user.listId ?? undefined,
  })

  const res = NextResponse.json({
    user: { id: user.id, username: user.username, name: user.name, role: user.role,
            electionId: user.electionId, listId: user.listId },
  })
  res.cookies.set(setTokenCookie(token))
  return res
}
