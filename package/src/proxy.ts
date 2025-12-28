// src/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME, verifySession } from '@/lib/auth/session';

const PUBLIC_PATHS = ['/authentication/login'];
const AUTH_API_PREFIX = '/api/auth/';

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((publicPath) => pathname === publicPath) ||
  pathname.startsWith(AUTH_API_PREFIX);

const STATIC_EXTENSIONS = /\.(css|js|json|ico|png|jpg|jpeg|gif|svg|webp|avif)$/i;

const isAssetPath = (pathname: string) =>
  pathname.startsWith('/_next') ||
  pathname === '/favicon.ico' ||
  pathname.startsWith('/images') ||
  pathname.startsWith('/fonts') ||
  pathname.startsWith('/public') ||
  STATIC_EXTENSIONS.test(pathname);

const OPERATOR_READONLY_API_PREFIXES = [
  '/api/harvests/options',
  '/api/fields',
  '/api/lotes',
  '/api/cycles',
  '/api/stock',
  '/api/stocks',
  '/api/truck-trips',
];

const OPERATOR_CREATE_ALLOWED_PREFIXES = ['/api/stocks', '/api/truck-trips'];

const isOperatorAllowedPath = (pathname: string, method: string) => {
  const normalize = (prefix: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`);

  if (pathname === '/cosechas' || pathname.startsWith('/cosechas/')) {
    return true;
  }

  if (normalize('/api/harvests')) {
    return true;
  }

  if (
    method === 'GET' &&
    OPERATOR_READONLY_API_PREFIXES.some((prefix) => normalize(prefix))
  ) {
    return true;
  }

  if (
    method === 'POST' &&
    OPERATOR_CREATE_ALLOWED_PREFIXES.some((prefix) => pathname === prefix)
  ) {
    return true;
  }

  return false;
};

const redirectToLogin = (request: NextRequest) => {
  const loginUrl = new URL('/authentication/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAssetPath(pathname) || pathname === '/') {
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

  if (
    session.role === 'operador' &&
    !isOperatorAllowedPath(pathname, request.method || 'GET')
  ) {
    return NextResponse.redirect(new URL('/cosechas', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
