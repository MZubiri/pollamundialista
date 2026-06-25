import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me-in-production';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Paths requiring authentication
  const isAdminPath = pathname.startsWith('/admin');
  const isDashboardPath = pathname.startsWith('/dashboard');

  if (isAdminPath || isDashboardPath) {
    if (!token) {
      // Redirect to login page
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('auth_mode', 'login');
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(token, secretKey);
      
      if (isAdminPath && payload.role !== 'ADMIN') {
        // Redirect to homepage or user view if not admin
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      // Token is invalid/expired
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
};
