// src/lib/auth/serverSession.ts
import 'server-only';

import { cookies } from 'next/headers';

import type { SessionUser } from './types';
import { SESSION_COOKIE_NAME, verifySession } from './session';
import { mapPayloadToSessionUser } from './user';

const secureCookie = process.env.NODE_ENV === 'production';

export type SessionCookieAttributes = {
  name: string;
  value: string;
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge?: number;
  expires?: Date;
};

export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;
  return mapPayloadToSessionUser(payload);
}

export const buildSessionDeletionCookie = (): SessionCookieAttributes => ({
  name: SESSION_COOKIE_NAME,
  value: '',
  httpOnly: true,
  sameSite: 'lax',
  secure: secureCookie,
  path: '/',
  maxAge: 0,
  expires: new Date(0),
});
