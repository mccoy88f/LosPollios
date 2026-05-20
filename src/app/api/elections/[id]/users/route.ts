import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createUser, deleteUser, listUsers, updateUser } from '@/lib/userAdmin'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id } = await params
  return NextResponse.json(await listUsers(Number(id)))
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  try {
    const user = await createUser({
      username: body.username,
      password: body.password,
      name: body.name,
      role: body.role,
      electionId: Number(id),
      listId: body.listId != null ? Number(body.listId) : null,
      sectionIds: Array.isArray(body.sectionIds) ? body.sectionIds.map(Number) : undefined,
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  await params
  const body = await req.json()
  if (!body.userId) {
    return NextResponse.json({ error: 'userId obbligatorio' }, { status: 400 })
  }
  try {
    const user = await updateUser(Number(body.userId), {
      username: body.username,
      password: body.password,
      name: body.name,
      role: body.role,
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

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  await params
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId obbligatorio' }, { status: 400 })
  if (Number(userId) === session.userId) {
    return NextResponse.json({ error: 'Non puoi eliminare il tuo account' }, { status: 400 })
  }
  try {
    await deleteUser(Number(userId))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
  }
}
