// src/app/api/auth/session/route.ts
import { NextResponse } from 'next/server';

import { getServerSession } from '@/lib/auth/serverSession';

export async function GET() {
  const session = await getServerSession();
  return NextResponse.json({
    user: session
      ? {
          id: session.id,
          username: session.username,
          name: session.name,
          role: session.role,
        }
      : null,
  });
}
