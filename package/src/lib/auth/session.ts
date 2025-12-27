// src/lib/auth/session.ts
import 'server-only';

import jwt from 'jsonwebtoken';

export const SESSION_COOKIE_NAME = 'ptsa_session';

export const SESSION_DURATIONS = {
  short: 60 * 60 * 8, // 8 hours
  long: 60 * 60 * 24 * 14, // 14 days
} as const;

export type SessionPayload = {
  uid: number;
  username: string;
  role: 'admin' | 'operador';
  name?: string;
};

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in the environment');
}

const isSessionPayload = (value: unknown): value is SessionPayload => {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;

  const role = payload.role;

  return (
    typeof payload.uid === 'number' &&
    Number.isFinite(payload.uid) &&
    typeof payload.username === 'string' &&
    payload.username.trim().length > 0 &&
    (role === 'admin' || role === 'operador') &&
    (payload.name === undefined ||
      payload.name === null ||
      typeof payload.name === 'string')
  );
};

const getMaxAge = (remember: boolean) =>
  remember ? SESSION_DURATIONS.long : SESSION_DURATIONS.short;

export function signSession(payload: SessionPayload, remember: boolean): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: getMaxAge(remember),
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || typeof decoded !== 'object') {
      return null;
    }

    return isSessionPayload(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export const getSessionCookieOptions = (remember: boolean) => ({
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/' as const,
  maxAge: getMaxAge(remember),
});

