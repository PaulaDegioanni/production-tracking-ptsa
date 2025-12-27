// src/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME, verifySession } from '@/lib/auth/session';

const PUBLIC_PATHS = ['/authentication/login'];
const AUTH_API_PREFIX = '/api/auth/';

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((publicPath) => pathname === publicPath) ||
  pathname.startsWith(AUTH_API_PREFIX);

const isNextAsset = (pathname: string) =>
  pathname.startsWith('/_next') ||
  pathname === '/favicon.ico';

const isOperatorAllowedPath = (pathname: string) =>
  pathname === '/cosechas' || pathname.startsWith('/cosechas/');

const redirectToLogin = (request: NextRequest) => {
  const loginUrl = new URL('/authentication/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isNextAsset(pathname) || pathname === '/') {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return redirectToLogin(request);
  }

  if (session.role === 'operador' && !isOperatorAllowedPath(pathname)) {
    return NextResponse.redirect(new URL('/cosechas', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
