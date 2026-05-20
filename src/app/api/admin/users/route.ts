import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createUser, listUsers } from '@/lib/userAdmin'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const electionId = req.nextUrl.searchParams.get('electionId')
  const users = await listUsers(electionId ? Number(electionId) : undefined)
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const user = await createUser({
      username: body.username,
      password: body.password,
      name: body.name,
      role: body.role,
      electionId: body.electionId != null ? Number(body.electionId) : null,
      listId: body.listId != null ? Number(body.listId) : null,
      sectionIds: Array.isArray(body.sectionIds) ? body.sectionIds.map(Number) : undefined,
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
