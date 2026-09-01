import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

// Reachable without a session. EXACT is matched whole ('/' must never be
// treated as a prefix, or every route would be public); PREFIX matches subpaths.
const PUBLIC_EXACT = ['/', '/manifest.json', '/sw.js'];
const PUBLIC_PREFIX = ['/login', '/signup', '/api/login', '/api/signup', '/api/logout', '/icons'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIX.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const userId = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (userId != null) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
