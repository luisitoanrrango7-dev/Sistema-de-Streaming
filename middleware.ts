import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Obtener el token de autenticación de las cookies
  const token = request.cookies.get('auth-token');
  const isAuthPage = request.nextUrl.pathname === '/auth';

  // Si no hay token y no estamos en la página de autenticación, redirigir a /auth
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Si hay token y estamos en la página de autenticación, redirigir a /dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth', '/dashboard/:path*']
}