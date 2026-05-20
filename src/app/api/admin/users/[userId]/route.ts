import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { deleteUser, updateUser } from '@/lib/userAdmin'

type Params = { params: Promise<{ userId: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { userId } = await params
  try {
    const body = await req.json()
    const user = await updateUser(Number(userId), {
      username: body.username,
      password: body.password,
      name: body.name,
      role: body.role,
      electionId: body.electionId !== undefined ? (body.electionId != null ? Number(body.electionId) : null) : undefined,
      listId: body.listId !== undefined ? (body.listId != null ? Number(body.listId) : null) : undefined,
      active: body.active,
      sectionIds: Array.isArray(body.sectionIds) ? body.sectionIds.map(Number) : undefined,
    })
    return NextResponse.json(user)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { userId } = await params
  const id = Number(userId)
  if (id === session.userId) {
    return NextResponse.json({ error: 'Non puoi eliminare il tuo account' }, { status: 400 })
  }

  try {
    await deleteUser(id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }
}
