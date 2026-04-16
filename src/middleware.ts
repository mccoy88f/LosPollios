import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

const PUBLIC_PATHS = ['/', '/login', '/live']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public paths and API (auth handled per-route)
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next()
  }

  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Only admins can access /admin
  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Entry users can only access their election
  if (pathname.startsWith('/entry') && session.role === 'entry') {
    const parts = pathname.split('/')
    const electionIdInPath = parts[2]
    if (electionIdInPath && session.electionId && String(session.electionId) !== electionIdInPath) {
      return NextResponse.redirect(new URL(`/entry/${session.electionId}`, req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
