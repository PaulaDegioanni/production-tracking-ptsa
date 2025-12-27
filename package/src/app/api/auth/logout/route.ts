// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

import { buildSessionDeletionCookie } from '@/lib/auth/serverSession';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(buildSessionDeletionCookie());
  return response;
}
