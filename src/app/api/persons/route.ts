import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { namesMatch } from '@/lib/personUtils'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const persons = await prisma.person.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      _count: {
        select: {
          candidates: true,
          mayorForLists: true,
          historicalMayors: true,
          historicalCouncilCandidates: true,
        },
      },
    },
  })
  return NextResponse.json(persons)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { firstName, lastName, notes } = await req.json()
  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'Nome e cognome obbligatori' }, { status: 400 })
  }
  const fn = firstName.trim()
  const ln = lastName.trim()
  const persons = await prisma.person.findMany()
  const existing = persons.find(p => namesMatch(p.firstName, fn) && namesMatch(p.lastName, ln))
  if (existing) {
    return NextResponse.json(existing)
  }
  const person = await prisma.person.create({
    data: { firstName: fn, lastName: ln, notes: notes?.trim() || null },
  })
  return NextResponse.json(person, { status: 201 })
}
