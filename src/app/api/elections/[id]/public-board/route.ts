import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  clampPublicBoardRefreshSeconds,
  generatePublicBoardToken,
  invalidatePublicBoardCache,
  publicBoardUrl,
} from '@/lib/publicBoard'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { id } = await params
  const election = await prisma.election.findUnique({
    where: { id: Number(id) },
    select: {
      publicBoardEnabled: true,
      publicBoardToken: true,
      publicBoardRefreshSeconds: true,
    },
  })
  if (!election) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const token = election.publicBoardToken
  return NextResponse.json({
    enabled: election.publicBoardEnabled,
    refreshSeconds: clampPublicBoardRefreshSeconds(election.publicBoardRefreshSeconds),
    token,
    publicUrl: token ? publicBoardUrl(token) : null,
  })
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { id } = await params
  const electionId = Number(id)
  const existing = await prisma.election.findUnique({
    where: { id: electionId },
    select: { publicBoardToken: true },
  })
  if (!existing) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  const body = await req.json()
  const data: {
    publicBoardEnabled?: boolean
    publicBoardRefreshSeconds?: number
    publicBoardToken?: string
  } = {}

  if (body.enabled !== undefined) {
    data.publicBoardEnabled = Boolean(body.enabled)
    if (data.publicBoardEnabled && !existing.publicBoardToken) {
      data.publicBoardToken = generatePublicBoardToken()
    }
  }

  if (body.refreshSeconds !== undefined) {
    data.publicBoardRefreshSeconds = clampPublicBoardRefreshSeconds(Number(body.refreshSeconds))
  }

  if (body.regenerateToken === true) {
    const oldToken = existing.publicBoardToken
    data.publicBoardToken = generatePublicBoardToken()
    if (oldToken) invalidatePublicBoardCache(oldToken)
  }

  const updated = await prisma.election.update({
    where: { id: electionId },
    data,
    select: {
      publicBoardEnabled: true,
      publicBoardToken: true,
      publicBoardRefreshSeconds: true,
    },
  })

  if (updated.publicBoardToken) invalidatePublicBoardCache(updated.publicBoardToken)

  const token = updated.publicBoardToken
  return NextResponse.json({
    enabled: updated.publicBoardEnabled,
    refreshSeconds: clampPublicBoardRefreshSeconds(updated.publicBoardRefreshSeconds),
    token,
    publicUrl: token ? publicBoardUrl(token) : null,
  })
}
