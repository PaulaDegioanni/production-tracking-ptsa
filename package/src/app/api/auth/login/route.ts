// src/app/api/auth/login/route.ts
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

import { getUserByUsername } from '@/lib/baserow/users';
import {
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSession,
} from '@/lib/auth/session';
import {
  mapBaserowUserToSession,
  mapSessionUserToPayload,
  isUserActive,
} from '@/lib/auth/user';

type LoginRequestBody = {
  username?: string;
  password?: string;
  remember?: boolean;
};

const invalidCredentialsResponse = () =>
  NextResponse.json(
    { error: 'Usuario o contraseña incorrectos' },
    { status: 401 }
  );

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequestBody | null;

    const username = body?.username?.trim();
    const password = body?.password ?? '';
    const remember = Boolean(body?.remember);

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    const baserowUser = await getUserByUsername(username);
    if (!baserowUser || !isUserActive(baserowUser)) {
      return invalidCredentialsResponse();
    }

    const passwordHash = baserowUser['Hash Contraseña'] || '';
    if (!passwordHash) {
      return invalidCredentialsResponse();
    }

    const passwordMatches = await bcrypt.compare(password, passwordHash);
    if (!passwordMatches) {
      return invalidCredentialsResponse();
    }

    const sessionUser = mapBaserowUserToSession(baserowUser);
    if (!sessionUser) {
      return NextResponse.json(
        {
          error:
            'El usuario no tiene un rol válido asignado. Contacta al administrador.',
        },
        { status: 403 }
      );
    }

    const payload = mapSessionUserToPayload(sessionUser);
    const token = signSession(payload, remember);

    const response = NextResponse.json({
      ok: true,
      username: sessionUser.username,
      role: payload.role,
    });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      ...getSessionCookieOptions(remember),
    });

    return response;
  } catch (error) {
    console.error('Error al iniciar sesión', error);
    return NextResponse.json(
      { error: 'No se pudo iniciar sesión, intenta nuevamente.' },
      { status: 500 }
    );
  }
}
