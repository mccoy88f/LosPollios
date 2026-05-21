import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

const PUBLIC_PAGE_PATHS = ['/login']

const PUBLIC_API_PATHS = ['/api/auth/login']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)

  const withPathname = () =>
    NextResponse.next({
      request: { headers: requestHeaders },
    })

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return withPathname()
  }

  if (
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icons/') ||
    pathname === '/icon' ||
    pathname === '/icon.png' ||
    pathname.startsWith('/apple-icon')
  ) {
    return withPathname()
  }

  const session = await getSessionFromRequest(req)

  if (pathname.startsWith('/api')) {
    if (PUBLIC_API_PATHS.some(p => pathname === p)) {
      return NextResponse.next()
    }
    if (!session) {
      return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (PUBLIC_PAGE_PATHS.some(p => pathname === p)) {
    if (session && pathname === '/login') {
      const dest =
        session.role === 'admin'
          ? '/admin'
          : session.role === 'entry' && session.electionId
            ? `/entry/${session.electionId}`
            : '/'
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return withPathname()
  }

  if (!session) {
    const login = new URL('/login', req.url)
    login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }

  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (pathname.startsWith('/entry') && session.role === 'entry') {
    const parts = pathname.split('/')
    const electionIdInPath = parts[2]
    const sectionIdInPath = parts[3]

    if (electionIdInPath && session.electionId && String(session.electionId) !== electionIdInPath) {
      return NextResponse.redirect(new URL(`/entry/${session.electionId}`, req.url))
    }

    if (sectionIdInPath && session.allowedSectionIds?.length) {
      const sid = Number(sectionIdInPath)
      if (!session.allowedSectionIds.includes(sid)) {
        return NextResponse.redirect(new URL(`/entry/${session.electionId}`, req.url))
      }
    }
  }

  return withPathname()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
