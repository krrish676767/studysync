// Route protection: every page and API route needs a valid session,
// and /admin is restricted to the admin role.
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/logout'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p)) return NextResponse.next();

  const isApi = pathname.startsWith('/api/');
  const token = request.cookies.get('studysync_session')?.value;
  let user = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-only-secret-change-me');
      user = (await jwtVerify(token, secret)).payload;
    } catch {
      user = null;
    }
  }

  if (!user) {
    if (isApi) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const adminOnly = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (adminOnly && user.role !== 'admin') {
    if (isApi) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
