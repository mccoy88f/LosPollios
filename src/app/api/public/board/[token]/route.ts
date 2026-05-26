import { NextRequest, NextResponse } from 'next/server'
import { getPublicBoardByToken } from '@/lib/publicBoard'

type Params = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params
  if (!token?.trim()) {
    return NextResponse.json({ error: 'Token mancante' }, { status: 400 })
  }

  const result = await getPublicBoardByToken(token.trim())
  if (!result) {
    return NextResponse.json({ error: 'Tabellone non disponibile' }, { status: 404 })
  }

  const maxAge = result.refreshSeconds
  return new NextResponse(result.json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
    },
  })
}
