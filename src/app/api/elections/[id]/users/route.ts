import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id } = await params
  const users = await prisma.user.findMany({
    where: { electionId: Number(id) },
    select: { id: true, username: true, name: true, role: true, listId: true, active: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id } = await params
  const { username, password, name, role, listId } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Username e password obbligatori' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      username,
      password: hashed,
      name,
      role: role ?? 'entry',
      electionId: Number(id),
      listId: listId ? Number(listId) : null,
    },
    select: { id: true, username: true, name: true, role: true, listId: true, active: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  await params
  const { userId, active, password } = await req.json()

  const data: Record<string, unknown> = {}
  if (active !== undefined) data.active = active
  if (password) data.password = await bcrypt.hash(password, 10)

  const user = await prisma.user.update({
    where: { id: Number(userId) },
    data,
    select: { id: true, username: true, name: true, role: true, active: true },
  })
  return NextResponse.json(user)
}
