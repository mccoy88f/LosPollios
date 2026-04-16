import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const sections = await prisma.section.findMany({
    where: { electionId: Number(id) },
    orderBy: { number: 'asc' },
    include: {
      turnout: true,
      listResults: { include: { list: true } },
    },
  })
  return NextResponse.json(sections)
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()

  // Bulk creation: { sections: [{number, name, location, theoreticalVoters}] }
  if (Array.isArray(body.sections)) {
    const created = await prisma.$transaction(
      body.sections.map((s: { number: number; name?: string; location?: string; theoreticalVoters?: number }) =>
        prisma.section.upsert({
          where: { electionId_number: { electionId: Number(id), number: s.number } },
          update: { name: s.name, location: s.location, theoreticalVoters: s.theoreticalVoters ?? 0 },
          create: {
            electionId: Number(id),
            number: s.number,
            name: s.name,
            location: s.location,
            theoreticalVoters: s.theoreticalVoters ?? 0,
            order: s.number,
          },
        })
      )
    )
    return NextResponse.json(created, { status: 201 })
  }

  // Single creation
  const { number, name, location, theoreticalVoters } = body
  const section = await prisma.section.create({
    data: {
      electionId: Number(id),
      number: Number(number),
      name,
      location,
      theoreticalVoters: Number(theoreticalVoters ?? 0),
      order: Number(number),
    },
  })
  return NextResponse.json(section, { status: 201 })
}
